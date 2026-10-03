import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, isHttpUrl } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { get, getCacheType, set } from "../../../util/cache/package/index.js";
import { RequestError } from "../../../util/http/got.js";
import { Result } from "../../../util/result.js";
import { refusedHostMessage } from "../../../util/http/util.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { isMavenCentral } from "./common.js";
import { PackageHttpCacheProvider } from "../../../util/http/cache/package-http-cache-provider.js";
import { getS3Client, parseS3Url } from "../../../util/s3.js";
import { streamToString } from "../../../util/streams.js";
import { getGoogleAuthToken } from "../util.js";
import { CachedMavenXml } from "./schema.js";
import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { XmlDocument } from "xmldoc";
//#region lib/modules/datasource/maven/util.ts
function isTemporaryError(err) {
	if (err.code === "ECONNRESET") return true;
	if (err.response) {
		const status = err.response.statusCode;
		return status === 429 || status >= 500 && status < 600;
	}
	return false;
}
function isHostError(err) {
	return err.code === "ETIMEDOUT";
}
function isNotFoundError(err) {
	return err.code === "ENOTFOUND" || err.response?.statusCode === 404;
}
function isPermissionsIssue(err) {
	const status = err.response?.statusCode;
	return status === 401 || status === 403;
}
function isConnectionError(err) {
	return err.code === "EAI_AGAIN" || err.code === "ERR_TLS_CERT_ALTNAME_INVALID" || err.code === "ECONNREFUSED";
}
function isUnsupportedHostError(err) {
	return err.name === "UnsupportedProtocolError";
}
const cacheProvider = new PackageHttpCacheProvider({
	namespace: "datasource-maven:cache-provider",
	softTtlMinutes: 15,
	checkAuthorizationHeader: true,
	checkCacheControlHeader: false,
	writeSchema: CachedMavenXml
});
const pomCacheProvider = new PackageHttpCacheProvider({
	namespace: "datasource-maven:pom-cache-provider",
	softTtlMinutes: 40320,
	checkAuthorizationHeader: true,
	checkCacheControlHeader: false,
	writeSchema: CachedMavenXml
});
function selectCacheProvider(url) {
	if (url.endsWith(".pom") && !url.endsWith("-SNAPSHOT.pom")) return pomCacheProvider;
	return cacheProvider;
}
const METADATA_NOT_FOUND_NAMESPACE = "datasource-maven:metadata-not-found";
const METADATA_NOT_FOUND_TTL_MINUTES = 720;
/** introduces jitter to make sure that a given repo's cache expiring doesn't lead to many requests leading to high traffic and/or rate limits */
function getMetadataNotFoundTtl() {
	const jitter = Math.floor(Math.random() * 60 * 2);
	return METADATA_NOT_FOUND_TTL_MINUTES + jitter;
}
function isMetadataUrl(url) {
	return url.endsWith("/maven-metadata.xml");
}
async function downloadHttpProtocol(http, pkgUrl, opts = {}) {
	const url = pkgUrl.toString();
	if (isMetadataUrl(url)) {
		if (await get(METADATA_NOT_FOUND_NAMESPACE, url)) {
			logger.trace({ url }, "Returning cached 404 response for the metadata-metadata URL request");
			return Result.err({ type: "not-found" });
		}
	}
	const fetchResult = await Result.wrap(http.getText(url, {
		...opts,
		cacheProvider: selectCacheProvider(url)
	})).transform((res) => {
		const result = { data: res.body };
		if (!res.authorization) result.isCacheable = true;
		const lastModified = asTimestamp(res?.headers?.["last-modified"]);
		if (lastModified) result.lastModified = lastModified;
		return result;
	}).catch(async (err) => {
		/* v8 ignore next: never happens, needs for type narrowing */
		if (!(err instanceof RequestError)) return Result.err({
			type: "unknown",
			err
		});
		const failedUrl = url;
		if (["host-blocked", "host-disabled"].includes(err.message)) {
			logger.trace({ failedUrl }, refusedHostMessage(err));
			return Result.err({ type: "host-disabled" });
		}
		if (isNotFoundError(err)) {
			logger.trace({ failedUrl }, `Url not found`);
			if (isMetadataUrl(failedUrl)) await set(METADATA_NOT_FOUND_NAMESPACE, failedUrl, true, getMetadataNotFoundTtl());
			return Result.err({ type: "not-found" });
		}
		if (isHostError(err)) {
			logger.debug(`Cannot connect to host ${failedUrl}`);
			return Result.err({ type: "host-error" });
		}
		if (isPermissionsIssue(err)) {
			logger.debug(`Dependency lookup unauthorized. Please add authentication with a hostRule for ${failedUrl}`);
			return Result.err({ type: "permission-issue" });
		}
		if (isTemporaryError(err)) {
			logger.debug({
				failedUrl,
				err
			}, "Temporary error");
			if (isMavenCentral(url)) {
				if (err?.response?.statusCode === 429) {
					if (getCacheType() === "redis") logger.once.warn({ failedUrl }, "Maven Central rate limiting detected despite Redis caching.");
					else logger.once.warn({ failedUrl }, "Maven Central rate limiting detected. Persistent caching required.");
				}
				return Result.err({
					type: "maven-central-temporary-error",
					err
				});
			}
			return Result.err({ type: "temporary-error" });
		}
		if (isConnectionError(err)) {
			logger.debug(`Connection refused to maven registry ${failedUrl}`);
			return Result.err({ type: "connection-error" });
		}
		if (isUnsupportedHostError(err)) {
			logger.debug(`Unsupported host ${failedUrl}`);
			return Result.err({ type: "unsupported-host" });
		}
		logger.info({
			failedUrl,
			err
		}, "Unknown HTTP download error");
		return Result.err({
			type: "unknown",
			err
		});
	});
	const { err } = fetchResult.unwrap();
	if (err?.type === "maven-central-temporary-error") throw new ExternalHostError(err.err);
	return fetchResult;
}
async function downloadHttpContent(http, pkgUrl, opts = {}) {
	return (await downloadHttpProtocol(http, pkgUrl, opts)).transform(({ data }) => data).unwrapOrNull();
}
function isS3NotFound(err) {
	return err.message === "NotFound" || err.message === "NoSuchKey";
}
async function downloadS3Protocol(pkgUrl) {
	logger.trace({ url: pkgUrl.toString() }, `Attempting to load S3 dependency`);
	const s3Url = parseS3Url(pkgUrl);
	if (!s3Url) return Result.err({ type: "invalid-url" });
	return await Result.wrap(() => {
		const command = new GetObjectCommand(s3Url);
		return getS3Client().send(command);
	}).transform(async ({ Body, LastModified, DeleteMarker }) => {
		if (DeleteMarker) {
			logger.trace({ failedUrl: pkgUrl.toString() }, "Maven S3 lookup error: DeleteMarker encountered");
			return Result.err({ type: "not-found" });
		}
		if (!(Body instanceof Readable)) {
			logger.debug({ failedUrl: pkgUrl.toString() }, "Maven S3 lookup error: unsupported Body type");
			return Result.err({ type: "unsupported-format" });
		}
		const result = { data: await streamToString(Body) };
		const lastModified = asTimestamp(LastModified);
		if (lastModified) result.lastModified = lastModified;
		return Result.ok(result);
	}).catch((err) => {
		if (!(err instanceof Error)) return Result.err(err);
		const failedUrl = pkgUrl.toString();
		if (err.name === "CredentialsProviderError") {
			logger.debug({ failedUrl }, "Maven S3 lookup error: credentials provider error, check \"AWS_ACCESS_KEY_ID\" and \"AWS_SECRET_ACCESS_KEY\" variables");
			return Result.err({ type: "credentials-error" });
		}
		if (err.message === "Region is missing") {
			logger.debug({ failedUrl }, "Maven S3 lookup error: missing region, check \"AWS_REGION\" variable");
			return Result.err({ type: "missing-aws-region" });
		}
		if (isS3NotFound(err)) {
			logger.trace({ failedUrl }, "Maven S3 lookup error: object not found");
			return Result.err({ type: "not-found" });
		}
		logger.debug({
			failedUrl,
			err
		}, "Maven S3 lookup error: unknown error");
		return Result.err({
			type: "unknown",
			err
		});
	});
}
async function downloadArtifactRegistryProtocol(http, pkgUrl) {
	const opts = {};
	const host = pkgUrl.host;
	const path = pkgUrl.pathname;
	logger.trace({
		host,
		path
	}, `Using google auth for Maven repository`);
	const auth = await getGoogleAuthToken();
	if (auth) opts.headers = { authorization: `Basic ${auth}` };
	else logger.once.debug({
		host,
		path
	}, "Could not get Google access token, using no auth");
	return downloadHttpProtocol(http, pkgUrl.toString().replace("artifactregistry:", "https:"), opts);
}
function containsPlaceholder(str) {
	return regEx(/\${.*?}/g).test(str);
}
function removeKnownPlaceholders(str) {
	return str.replace(regEx(/\/tree\/\${[^}]+}/), "");
}
function getMavenUrl(dependency, repoUrl, path) {
	return new URL(`${dependency.dependencyUrl}/${path}`, ensureTrailingSlash(repoUrl));
}
async function downloadMaven(http, url) {
	const protocol = url.protocol;
	let result = Result.err({ type: "unsupported-protocol" });
	if (isHttpUrl(url)) result = await downloadHttpProtocol(http, url);
	if (protocol === "artifactregistry:") result = await downloadArtifactRegistryProtocol(http, url);
	if (protocol === "s3:") result = await downloadS3Protocol(url);
	return result.onError((err) => {
		if (err.type === "unsupported-protocol") logger.debug({ url: url.toString() }, `Maven lookup error: unsupported protocol (${protocol})`);
	});
}
async function downloadMavenXml(http, url) {
	return (await downloadMaven(http, url)).transform((result) => {
		try {
			return Result.ok({
				...result,
				data: new XmlDocument(result.data)
			});
		} catch (err) {
			return Result.err({
				type: "xml-parse-error",
				err
			});
		}
	});
}
function getDependencyParts(packageName) {
	const [group, name] = packageName.split(":");
	return {
		display: packageName,
		group,
		name,
		dependencyUrl: `${group.replace(regEx(/\./g), "/")}/${name}`
	};
}
function extractSnapshotVersion(metadata) {
	const version = metadata.descendantWithPath("version")?.val?.replace("-SNAPSHOT", "");
	const snapshot = metadata.descendantWithPath("versioning.snapshot");
	const timestamp = snapshot?.childNamed("timestamp")?.val;
	const build = snapshot?.childNamed("buildNumber")?.val;
	if (!version || !timestamp || !build) return null;
	return `${version}-${timestamp}-${build}`;
}
async function getSnapshotFullVersion(http, version, dependency, repoUrl) {
	return (await downloadMavenXml(http, getMavenUrl(dependency, repoUrl, `${version}/maven-metadata.xml`))).transform(({ data }) => Result.wrapNullable(extractSnapshotVersion(data), { type: "snapshot-extract-error" })).unwrapOrNull();
}
function isSnapshotVersion(version) {
	if (version.endsWith("-SNAPSHOT")) return true;
	return false;
}
async function createUrlForDependencyPom(http, version, dependency, repoUrl) {
	if (isSnapshotVersion(version)) {
		const fullVersion = await getSnapshotFullVersion(http, version, dependency, repoUrl);
		if (fullVersion !== null) return `${version}/${dependency.name}-${fullVersion}.pom`;
	}
	return `${version}/${dependency.name}-${version}.pom`;
}
async function getDependencyInfo(http, dependency, repoUrl, version, recursionLimit = 5) {
	return (await (await downloadMavenXml(http, getMavenUrl(dependency, repoUrl, await createUrlForDependencyPom(http, version, dependency, repoUrl)))).transform(async ({ data: pomContent }) => {
		const result = {};
		const homepage = pomContent.valueWithPath("url");
		if (homepage && !containsPlaceholder(homepage)) result.homepage = homepage;
		const sourceUrl = pomContent.valueWithPath("scm.url");
		if (sourceUrl && !containsPlaceholder(removeKnownPlaceholders(sourceUrl))) {
			result.sourceUrl = sourceUrl.replace(regEx(/^scm:/), "").replace(regEx(/^git:/), "").replace(regEx(/^git@github.com:/), "https://github.com/").replace(regEx(/^git@github.com\//), "https://github.com/");
			if (result.sourceUrl.startsWith("//")) result.sourceUrl = `https:${result.sourceUrl}`;
		}
		const relocation = pomContent.descendantWithPath("distributionManagement.relocation");
		if (relocation) {
			result.replacementName = `${relocation.valueWithPath("groupId") ?? dependency.group}:${relocation.valueWithPath("artifactId") ?? dependency.name}`;
			result.replacementVersion = relocation.valueWithPath("version") ?? version;
			const relocationMessage = relocation.valueWithPath("message");
			if (relocationMessage) result.deprecationMessage = relocationMessage;
		}
		const groupId = pomContent.valueWithPath("groupId");
		if (groupId) result.packageScope = groupId;
		const parent = pomContent.childNamed("parent");
		if (recursionLimit > 0 && parent && (!result.sourceUrl || !result.homepage)) {
			const [parentGroupId, parentArtifactId, parentVersion] = [
				"groupId",
				"artifactId",
				"version"
			].map((k) => parent.valueWithPath(k)?.replace(regEx(/\s+/g), ""));
			if (parentGroupId && parentArtifactId && parentVersion) {
				const parentInformation = await getDependencyInfo(http, getDependencyParts(`${parentGroupId}:${parentArtifactId}`), repoUrl, parentVersion, recursionLimit - 1);
				if (!result.sourceUrl && parentInformation.sourceUrl) result.sourceUrl = parentInformation.sourceUrl;
				if (!result.homepage && parentInformation.homepage) result.homepage = parentInformation.homepage;
			}
		}
		return result;
	})).unwrapOr({});
}
//#endregion
export { createUrlForDependencyPom, downloadArtifactRegistryProtocol, downloadHttpContent, downloadHttpProtocol, downloadMaven, downloadMavenXml, downloadS3Protocol, getDependencyInfo, getDependencyParts, getMavenUrl };

//# sourceMappingURL=util.js.map