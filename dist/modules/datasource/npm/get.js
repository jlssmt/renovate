import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { add, find } from "../../../util/host-rules.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { DeepNullish } from "../../../util/schema-utils/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { PackageHttpCacheProvider } from "../../../util/http/cache/package-http-cache-provider.js";
import { defaultRegistryUrl } from "./common.js";
import { CachedPackument, NpmResponse } from "./schema.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/npm/get.ts
const SHORT_REPO_REGEX = regEx(/^(?:(?<platform>bitbucket|github|gitlab):)?(?<shortRepo>[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/);
const platformMapping = {
	bitbucket: "https://bitbucket.org/",
	github: "https://github.com/",
	gitlab: "https://gitlab.com/"
};
const PackageSource = z.union([z.string().nonempty().transform((repository) => {
	let sourceUrl = null;
	const sourceDirectory = null;
	const shortMatch = repository.match(SHORT_REPO_REGEX);
	if (shortMatch?.groups) {
		const { platform = "github", shortRepo } = shortMatch.groups;
		sourceUrl = platformMapping[platform] + shortRepo;
	} else sourceUrl = repository;
	return {
		sourceUrl,
		sourceDirectory
	};
}), DeepNullish(z.object({
	url: z.string().nonempty().optional(),
	directory: z.string().nonempty().optional()
})).transform(({ url, directory }) => {
	const res = {
		sourceUrl: null,
		sourceDirectory: null
	};
	if (url) res.sourceUrl = url;
	if (directory) res.sourceDirectory = directory;
	return res;
})]).catch({
	sourceUrl: null,
	sourceDirectory: null
});
async function getDependency(http, registryUrl, packageName) {
	logger.trace(`npm.getDependency(${packageName})`);
	const packageUrl = joinUrlParts(registryUrl, packageName.replace("/", "%2F"));
	try {
		const options = { cacheProvider: new PackageHttpCacheProvider({
			namespace: "datasource-npm:cache-provider",
			checkAuthorizationHeader: false,
			checkCacheControlHeader: true,
			writeSchema: CachedPackument
		}) };
		if (registryUrl === "https://registry.npmjs.org" && find({ url: "https://registry.npmjs.org" })?.abortOnError === void 0) {
			logger.trace({
				packageName,
				registry: defaultRegistryUrl
			}, "setting abortOnError hostRule for well known host");
			add({
				matchHost: defaultRegistryUrl,
				abortOnError: true
			});
		}
		const resp = await http.getJson(packageUrl, options, NpmResponse);
		const { body: res } = resp;
		if (!res.versions || !Object.keys(res.versions).length) {
			logger.debug(`No versions returned for npm dependency ${packageName}`);
			return null;
		}
		const latestVersion = res.versions[res["dist-tags"]?.latest ?? ""];
		res.repository ??= latestVersion?.repository;
		res.homepage ??= latestVersion?.homepage;
		const { sourceUrl, sourceDirectory } = PackageSource.parse(res.repository);
		const dep = {
			homepage: res.homepage,
			releases: [],
			tags: res["dist-tags"],
			registryUrl
		};
		if (sourceUrl) dep.sourceUrl = sourceUrl;
		if (sourceDirectory) dep.sourceDirectory = sourceDirectory;
		if (latestVersion?.deprecated) dep.deprecationMessage = `On registry \`${registryUrl}\`, the "latest" version of dependency \`${packageName}\` has the following deprecation notice:\n\n\`${latestVersion.deprecated}\`\n\nMarking the latest version of an npm package as deprecated results in the entire package being considered deprecated, so contact the package author you think this is a mistake.`;
		dep.releases = Object.keys(res.versions).map((version) => {
			const release = {
				version,
				gitRef: res.versions?.[version].gitHead,
				dependencies: res.versions?.[version].dependencies,
				devDependencies: res.versions?.[version].devDependencies,
				attestation: isString(res.versions?.[version].dist?.attestations?.url)
			};
			if (res.versions?.[version].dist?.integrity) release.newDigest = res.versions[version].dist.integrity;
			if (res.versions?.[version].dist?.tarball) release.downloadUrl = res.versions[version].dist.tarball;
			const releaseTimestamp = asTimestamp(res.time?.[version]);
			if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
			if (res.versions?.[version].deprecated) release.isDeprecated = true;
			const nodeConstraint = res.versions?.[version].engines?.node;
			if (isNonEmptyString(nodeConstraint)) release.constraints = { node: [nodeConstraint] };
			const source = PackageSource.parse(res.versions?.[version].repository);
			if (source.sourceUrl && source.sourceUrl !== dep.sourceUrl) release.sourceUrl = source.sourceUrl;
			if (source.sourceDirectory && source.sourceDirectory !== dep.sourceDirectory) release.sourceDirectory = source.sourceDirectory;
			if (dep.deprecationMessage) release.isDeprecated = true;
			return release;
		});
		if (!resp.headers?.["cache-control"]?.toLocaleLowerCase()?.split(regEx(/\s*,\s*/))?.includes("public")) dep.isPrivate = true;
		logger.trace({ dep }, "dep");
		return dep;
	} catch (err) {
		const actualError = err instanceof ExternalHostError ? err.err : err;
		if (actualError.message === "host-blocked" || actualError.message === "host-disabled" || [
			401,
			402,
			403,
			404
		].includes(actualError.statusCode) || ["ENOTFOUND"].includes(actualError.code)) return null;
		if (err instanceof ExternalHostError) {
			if (actualError.name === "ParseError" && actualError.body) {
				actualError.body = "err.body deleted by Renovate";
				err.err = actualError;
			}
			throw err;
		}
		logger.debug({
			err,
			packageName,
			registryUrl
		}, "Unknown npm lookup error");
		return null;
	}
}
//#endregion
export { getDependency };

//# sourceMappingURL=get.js.map