import { getEnv } from "../../../util/env.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts, parseUrl, trimLeadingSlash, trimTrailingSlash } from "../../../util/url.js";
import { detectPlatform } from "../../../util/common.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { filterMap } from "../../../util/filter-map.js";
import { api } from "../../versioning/go-mod-directive/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { map } from "../../../util/promises.js";
import { GithubHttp } from "../../../util/http/github.js";
import { queryReleases } from "../../../util/github/graphql/index.js";
import { GithubReleasesDatasource } from "../github-releases/index.js";
import { BaseGoDatasource } from "./base.js";
import { parseGoproxy, parseNoproxy } from "./goproxy-parser.js";
import { getSourceUrl, isPublicGoPackage } from "./common.js";
import { GoDirectDatasource } from "./releases-direct.js";
import { VersionInfo } from "./schema.js";
import { GoVersionTimestampCache } from "./timestamp-cache.js";
import { isNonEmptyString, isNonEmptyStringAndNotWhitespace, isTruthy } from "@sindresorhus/is";
//#region lib/modules/datasource/go/releases-goproxy.ts
/** TODO #42566 */
const goVersionRegex = regEx(/^\s*go\s+(?<version>[^\s]+)\s*$/);
const modRegex = regEx(/^(?<baseMod>.*?)(?:[./]v(?<majorVersion>\d+))?$/);
const versionTagRegex = regEx(/^v\d/);
/**
* Modules with a major version of v2 or above which have no `go.mod` are reported by a Go proxy with a `+incompatible` suffix, which is absent from the tag they were published as.
*
* @see https://go.dev/ref/mod#non-module-compat
*/
const incompatibleSuffixRegex = regEx(/\+incompatible$/);
/**
* @see https://go.dev/ref/mod#pseudo-versions
*/
const pseudoVersionRegex = regEx(/v\d+\.\d+\.\d+-(?:\w+\.)?(?:0\.)?(?<timestamp>\d{14})-(?<digest>[a-f0-9]{12})/i);
function pseudoVersionToRelease(pseudoVersion) {
	const match = pseudoVersion.match(pseudoVersionRegex)?.groups;
	if (!match) return null;
	const { digest: newDigest, timestamp } = match;
	return {
		version: pseudoVersion,
		newDigest,
		releaseTimestamp: asTimestamp(timestamp)
	};
}
/**
* A Go module which lives in a subdirectory of its repository is tagged with that subdirectory as a prefix, so `github.com/aws/aws-sdk-go-v2/service/s3` publishes `v1.2.3` as the tag `service/s3/v1.2.3`.
*
* @see https://go.dev/ref/mod#vcs-version
*
* Because we can't tell from the module path alone where the repository ends and the subdirectory begins, we try each candidate prefix - longest first - against the tags we actually found, in the same way as `filterByPrefix` does for direct lookups.
*/
function getTagPrefix(goModule, tags) {
	const nameParts = goModule.replace(regEx(/\/v\d+$/), "").split("/").slice(1);
	const tagNames = [...tags];
	while (nameParts.length) {
		const prefix = `${nameParts.join("/")}/`;
		if (tagNames.some((tag) => tag.startsWith(prefix) && versionTagRegex.test(tag.slice(prefix.length)))) return prefix;
		nameParts.shift();
	}
	return "";
}
var GoProxyDatasource = class GoProxyDatasource extends Datasource {
	static id = "go-proxy";
	constructor() {
		super(GoProxyDatasource.id);
	}
	direct = new GoDirectDatasource();
	githubHttp = new GithubHttp(GithubReleasesDatasource.id);
	async _getReleases(config) {
		const { packageName } = config;
		logger.trace(`goproxy.getReleases(${packageName})`);
		const goproxy = getEnv().GOPROXY ?? `https://proxy.golang.org,direct`;
		if (goproxy === "direct") return this.direct.getReleases(config);
		const proxyList = parseGoproxy(goproxy);
		const noproxy = parseNoproxy();
		let result = null;
		let servedByProxy = false;
		if (noproxy?.test(packageName)) {
			logger.debug(`Fetching ${packageName} via GONOPROXY match`);
			result = await this.direct.getReleases(config);
			return result;
		}
		for (const { url, fallback } of proxyList) try {
			if (url === "off") break;
			else if (url === "direct") {
				result = await this.direct.getReleases(config);
				break;
			}
			const res = await this.getVersionsWithInfo(url, packageName, config.constraintsFiltering);
			if (res.releases.length) {
				result = res;
				servedByProxy = true;
				break;
			}
		} catch (err) {
			const statusCode = (err instanceof ExternalHostError ? err.err : err)?.response?.statusCode;
			if (!(fallback === "|" ? true : statusCode === 404 || statusCode === 410)) {
				logger.debug({ err }, "Goproxy error: not falling back to other URLs provided with GOPROXY, rethrowing");
				this.handleGenericErrors(err);
			}
			logger.debug({ err }, "Goproxy error: trying next URL provided with GOPROXY");
		}
		if (result && !result.sourceUrl) try {
			const datasource = await BaseGoDatasource.getDatasource(packageName);
			const sourceUrl = getSourceUrl(datasource);
			if (sourceUrl) result.sourceUrl = sourceUrl;
		} catch (err) {
			logger.trace({ err }, `Can't get datasource for ${packageName}`);
		}
		if (result?.sourceUrl && servedByProxy) await this.addGithubReleaseTimestamps(packageName, result.sourceUrl, result.releases);
		return result;
	}
	/**
	* A Go proxy reports the commit time of the tagged commit as a version's `Time`, which can be much earlier than the point at which that version was released.
	*
	* When the module is hosted on GitHub and the version has a GitHub Release, the Release's publication time is a better indicator of when the version became available.
	*/
	async addGithubReleaseTimestamps(packageName, sourceUrl, releases) {
		if (detectPlatform(sourceUrl) !== "github") return;
		const parsedUrl = parseUrl(sourceUrl);
		/* v8 ignore next -- detectPlatform only returns a platform for parseable URLs */
		if (!parsedUrl) return;
		const repository = trimTrailingSlash(trimLeadingSlash(parsedUrl.pathname)).replace(regEx(/\.git$/), "");
		try {
			const githubReleases = await queryReleases({
				packageName: repository,
				registryUrl: parsedUrl.origin
			}, this.githubHttp);
			const timestamps = /* @__PURE__ */ new Map();
			for (const { version, releaseTimestamp } of githubReleases) timestamps.set(version, releaseTimestamp);
			const tagPrefix = getTagPrefix(packageName, timestamps.keys());
			for (const release of releases) {
				const version = release.version.replace(incompatibleSuffixRegex, "");
				const releaseTimestamp = timestamps.get(`${tagPrefix}${version}`);
				if (releaseTimestamp && (!release.releaseTimestamp || releaseTimestamp > release.releaseTimestamp)) release.releaseTimestamp = releaseTimestamp;
			}
		} catch (err) {
			logger.debug({
				err,
				packageName
			}, "Error fetching GitHub Releases for Go module");
		}
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GoProxyDatasource.id}`,
			key: GoProxyDatasource.getCacheKey(config),
			cacheable: isPublicGoPackage(config.packageName),
			fallback: true
		}, () => this._getReleases(config));
	}
	/**
	* Avoid ambiguity when serving from case-insensitive file systems.
	*
	* @see https://golang.org/ref/mod#goproxy-protocol
	*/
	encodeCase(input) {
		return input.replace(regEx(/(?:[A-Z])/g), (x) => `!${x.toLowerCase()}`);
	}
	async listVersions(baseUrl, packageName) {
		const url = joinUrlParts(baseUrl, this.encodeCase(packageName), "@v", "list");
		const { body } = await this.http.getText(url);
		return filterMap(body.split(newlineRegex), (str) => {
			if (!isNonEmptyStringAndNotWhitespace(str)) return null;
			const [version, timestamp] = str.trim().split(regEx(/\s+/));
			const release = pseudoVersionToRelease(version) ?? { version };
			const releaseTimestamp = asTimestamp(timestamp);
			if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
			return release;
		});
	}
	async versionInfo(baseUrl, packageName, version) {
		const url = joinUrlParts(baseUrl, this.encodeCase(packageName), "@v", `${version}.info`);
		const res = await this.http.getJson(url, VersionInfo);
		const result = { version: res.body.Version };
		const releaseTimestamp = asTimestamp(res.body.Time);
		if (releaseTimestamp) result.releaseTimestamp = releaseTimestamp;
		return result;
	}
	/**
	* Retrieve the `go` directive for a given Go Module.
	*
	* NOTE that this means the `go` directive, not the `toolchain` directive.
	*/
	async retrieveGoDirectiveForModule(baseUrl, packageName, version) {
		return withCache({
			namespace: `datasource-${GoProxyDatasource.id}`,
			key: GoProxyDatasource.getVersionedCacheKey(packageName, version),
			ttlMinutes: 144e3,
			cacheable: isPublicGoPackage(packageName)
		}, () => this._retrieveGoDirectiveForModule(baseUrl, packageName, version));
	}
	async _retrieveGoDirectiveForModule(baseUrl, packageName, version) {
		const url = joinUrlParts(baseUrl, this.encodeCase(packageName), "@v", `${version}.mod`);
		const res = await this.http.getText(url);
		let goDirective = void 0;
		for (const line of res.body.split("\n")) {
			const goVersionMatches = goVersionRegex.exec(line)?.groups;
			if (goVersionMatches) {
				goDirective = goVersionMatches.version;
				break;
			}
		}
		if (!goDirective) return goDirective;
		const parts = goDirective.split(".");
		if (parts.length === 1) return `${parts[0]}.0.0`;
		if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;
		return `${parts[0]}.${parts[1]}.${parts[2]}`;
	}
	async getLatestVersion(baseUrl, packageName) {
		try {
			const url = joinUrlParts(baseUrl, this.encodeCase(packageName), "@latest");
			const { Version: version, Origin: origin } = (await this.http.getJson(url, VersionInfo)).body;
			return {
				version,
				sourceUrl: origin?.VCS === "git" && isNonEmptyString(origin.URL) ? origin.URL.replace(regEx(/\.git$/), "") : void 0
			};
		} catch (err) {
			logger.trace({ err }, "Failed to get latest version");
			return null;
		}
	}
	async getVersionsWithInfo(baseUrl, packageName, constraintsFiltering) {
		const isGopkgin = packageName.startsWith("gopkg.in/");
		const majorSuffixSeparator = isGopkgin ? "." : "/";
		const modParts = packageName.match(modRegex)?.groups;
		/* v8 ignore start: defensive - modRegex matches any non-empty package name, so baseMod is always set */
		const baseMod = modParts?.baseMod ?? packageName;
		/* v8 ignore stop */
		const packageMajor = parseInt(modParts?.majorVersion ?? "0", 10);
		const result = { releases: [] };
		for (let major = packageMajor;; major += 1) {
			let pkg = `${baseMod}${majorSuffixSeparator}v${major}`;
			if (!isGopkgin && major < 2) {
				pkg = baseMod;
				major += 1;
			}
			let releases = [];
			try {
				const filteredReleases = (await this.listVersions(baseUrl, pkg)).filter(({ version }) => {
					if (major < 2) return true;
					return version.split(regEx(/[^\d]+/)).find(isTruthy) === major.toString();
				});
				const timestamps = await GoVersionTimestampCache.init(baseUrl, pkg);
				releases = await map(filteredReleases, async (versionInfo) => {
					const { version, newDigest, releaseTimestamp } = versionInfo;
					if (releaseTimestamp) return {
						version,
						newDigest,
						releaseTimestamp
					};
					const cachedTimestamp = timestamps.get(version);
					if (cachedTimestamp) return {
						version,
						releaseTimestamp: cachedTimestamp
					};
					try {
						const release = await this.versionInfo(baseUrl, pkg, version);
						if (release.releaseTimestamp) timestamps.set(version, release.releaseTimestamp);
						return release;
					} catch (err) {
						logger.trace({ err }, `Can't obtain data from ${baseUrl}`);
						return { version };
					}
				});
				await timestamps.save();
				if (constraintsFiltering === "strict") releases = await map(releases, async (rel) => {
					try {
						const goDirective = await this.retrieveGoDirectiveForModule(baseUrl, pkg, rel.version);
						if (goDirective) {
							rel.constraints ??= {};
							rel.constraints["%goMod"] ??= [];
							rel.constraints["%goMod"].push(goDirective);
						}
					} catch (err) {
						logger.trace({ err }, `Can't obtain \`go\` directive from ${baseUrl}`);
					}
					return rel;
				});
				result.releases.push(...releases);
			} catch (err) {
				const potentialHttpError = err instanceof ExternalHostError ? err.err : err;
				const status = potentialHttpError.response?.statusCode;
				if (potentialHttpError instanceof RequestError && (status === 404 || status === 403) && major !== packageMajor) break;
				throw err;
			}
			const latest = await this.getLatestVersion(baseUrl, pkg);
			if (latest) {
				const { version: latestVersion, sourceUrl } = latest;
				result.tags ??= {};
				result.tags.latest ??= latestVersion;
				if (api.isGreaterThan(latestVersion, result.tags.latest)) result.tags.latest = latestVersion;
				if (sourceUrl) result.sourceUrl ??= sourceUrl;
				if (!result.releases.length) {
					const releaseFromLatest = pseudoVersionToRelease(latestVersion);
					// v8 ignore else -- needs an empty version list plus a non-pseudo latest
					if (releaseFromLatest) result.releases.push(releaseFromLatest);
				}
			}
			if (!releases.length) break;
		}
		return result;
	}
	static getCacheKey({ packageName, constraintsFiltering }) {
		const goproxy = getEnv().GOPROXY;
		const noproxy = parseNoproxy();
		const constraintsFilteringKey = constraintsFiltering && constraintsFiltering !== "none" ? `@@${constraintsFiltering}` : "";
		return `${packageName}@@${goproxy}@@${noproxy?.toString()}${constraintsFilteringKey}`;
	}
	static getVersionedCacheKey(packageName, version) {
		return `${packageName}@@${version}@@${getEnv().GOPROXY}@@${parseNoproxy()?.toString()}`;
	}
};
//#endregion
export { GoProxyDatasource, getTagPrefix, pseudoVersionToRelease };

//# sourceMappingURL=releases-goproxy.js.map