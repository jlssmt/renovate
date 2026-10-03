import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import { PLATFORM_FAMILIES } from "../../../../../constants/platforms.js";
import { isHttpUrl, joinUrlParts, parseUrl, trimSlashes } from "../../../../../util/url.js";
import { instrument } from "../../../../../instrumentation/index.js";
import { get } from "../../../../../modules/versioning/index.js";
import { get as get$1, set } from "../../../../../util/cache/package/index.js";
import { getPkgReleases } from "../../../../../modules/datasource/index.js";
import { memoize } from "../../../../../util/memoize.js";
import { slugifyUrl } from "./common.js";
import { addReleaseNotes } from "./release-notes.js";
import { getInRangeReleases } from "./releases.js";
import { isEmptyArray, isFalsy, isNonEmptyString, isNullOrUndefined, isTruthy } from "@sindresorhus/is";
//#region lib/workers/repository/update/pr/changelog/source.ts
function tagPrecision(tag) {
	return tag.split(".").length - 1;
}
var ChangeLogSource = class {
	cacheNamespace;
	platform;
	family;
	constructor(platform) {
		this.platform = platform;
		this.family = PLATFORM_FAMILIES[platform];
		this.cacheNamespace = `changelog-${platform}-release`;
	}
	getAPIBaseUrl(config) {
		return this.family.apiBaseUrl(this.getBaseUrl(config));
	}
	/**
	* Fetch the platform's list of releases for the project. Platforms without a
	* releases API keep this default.
	*/
	getReleaseList(_project, _release) {
		logger.trace(`${this.platform}: release lists are not supported`);
		return Promise.resolve([]);
	}
	async getAllTags(endpoint, repository) {
		const tags = (await getPkgReleases({
			registryUrls: [endpoint],
			datasource: this.family.tagsDatasource,
			packageName: repository,
			versioning: "regex:(?<major>\\d+)(\\.(?<minor>\\d+))?(\\.(?<patch>\\d+))?"
		}))?.releases;
		if (isNullOrUndefined(tags) || isEmptyArray(tags)) {
			logger.debug(`No ${this.family.tagsDatasource} tags found for repository: ${repository}`);
			return [];
		}
		return tags.map(({ version }) => version);
	}
	async getChangeLogJSON(config) {
		return await instrument(`source.getChangeLogJSON(${this.platform})`, async () => {
			logger.trace(`getChangeLogJSON for ${this.platform}`);
			const versioning = config.versioning;
			const currentVersion = config.currentVersion;
			const newVersion = config.newVersion;
			const sourceUrl = config.sourceUrl;
			const packageName = config.packageName;
			const depName = config.depName;
			const sourceDirectory = config.sourceDirectory;
			const versioningApi = get(versioning);
			if (this.shouldSkipPackage(config)) return null;
			const baseUrl = this.getBaseUrl(config);
			const apiBaseUrl = this.getAPIBaseUrl(config);
			const repository = this.getRepositoryFromUrl(config);
			const tokenResponse = this.hasValidToken(config);
			if (!tokenResponse.isValid) {
				if (tokenResponse.error) return { error: tokenResponse.error };
				return null;
			}
			if (isFalsy(this.hasValidRepository(repository))) {
				logger.debug(`Invalid ${this.platform} URL found: ${sourceUrl}`);
				return null;
			}
			const releases = config.releases ?? await getInRangeReleases(config);
			// v8 ignore next -- `getInRangeReleases` only returns null on paths it already ignores
			if (!releases?.length) {
				logger.debug("No releases");
				return null;
			}
			const validReleases = [...releases].filter((release) => versioningApi.isVersion(release.version)).sort((a, b) => versioningApi.sortVersions(a.version, b.version)).filter((release, index, sorted) => index === sorted.length - 1 || !versioningApi.equals(release.version, sorted[index + 1].version));
			if (validReleases.length < 2) {
				logger.debug(`Not enough valid releases for dep ${depName} (${packageName})`);
				return null;
			}
			const changelogReleases = [];
			function inRange(v) {
				return versioningApi.isGreaterThan(v, currentVersion) && !versioningApi.isGreaterThan(v, newVersion);
			}
			const getTags = memoize(() => this.getAllTags(apiBaseUrl, repository));
			for (let i = validReleases.length - 1; i >= 1; i -= 1) {
				const prev = validReleases[i - 1];
				const next = validReleases[i];
				if (!inRange(next.version)) continue;
				let release = await get$1(this.cacheNamespace, this.getCacheKey(sourceUrl, packageName, prev.version, next.version));
				if (!release) {
					release = {
						version: next.version,
						date: next.releaseTimestamp,
						gitRef: next.gitRef,
						changes: [],
						compare: {}
					};
					const tags = await getTags();
					const prevHead = this.getRef(versioningApi, packageName, depName, prev, tags);
					const nextHead = this.getRef(versioningApi, packageName, depName, next, tags);
					if (isNonEmptyString(prevHead) && isNonEmptyString(nextHead)) release.compare.url = this.getCompareURL(baseUrl, repository, prevHead, nextHead);
					await set(this.cacheNamespace, this.getCacheKey(sourceUrl, packageName, prev.version, next.version), release, 55);
				}
				changelogReleases.push(release);
			}
			let res = {
				project: {
					apiBaseUrl,
					baseUrl,
					type: this.platform,
					repository,
					sourceUrl,
					sourceDirectory,
					packageName,
					depName
				},
				versions: changelogReleases
			};
			res = await addReleaseNotes(res, config, this);
			return res;
		});
	}
	findTagOfRelease(versioningApi, packageName, depName, depNewVersion, tags) {
		const releaseRegexPrefix = `^(?:${packageName}|${depName}|release)[@_-]v?`;
		const regex = regEx(releaseRegexPrefix, void 0, false);
		const exactReleaseRegex = regEx(`${releaseRegexPrefix}${depNewVersion}`);
		const exactTagsList = tags.filter((tag) => {
			return exactReleaseRegex.test(tag);
		});
		const candidates = (exactTagsList.length ? exactTagsList : tags).filter((tag) => versioningApi.isVersion(tag.replace(regex, ""))).filter((tag) => versioningApi.equals(tag.replace(regex, ""), depNewVersion));
		if (!candidates.length) return;
		return candidates.reduce((mostPrecise, candidate) => tagPrecision(candidate) > tagPrecision(mostPrecise) ? candidate : mostPrecise);
	}
	getRef(versioningApi, packageName, depName, release, tags) {
		const tagName = this.findTagOfRelease(versioningApi, packageName, depName, release.version, tags);
		if (isNonEmptyString(tagName)) return tagName;
		if (isNonEmptyString(release.gitRef)) return release.gitRef;
		return null;
	}
	getCacheKey(sourceUrl, packageName, prev, next) {
		return `${slugifyUrl(sourceUrl)}:${packageName}:${prev}:${next}`;
	}
	getBaseUrl(config) {
		const parsedUrl = parseUrl(config.sourceUrl);
		if (isNullOrUndefined(parsedUrl)) return "";
		return `${parsedUrl.protocol.replace(regEx(/^git\+/), "")}//${parsedUrl.host}/`;
	}
	getRepositoryFromUrl(config) {
		const parsedUrl = parseUrl(config.sourceUrl);
		if (isNullOrUndefined(parsedUrl)) return "";
		const pathname = parsedUrl.pathname;
		return trimSlashes(pathname).replace(regEx(/\.git$/), "");
	}
	hasValidToken(_config) {
		return { isValid: true };
	}
	shouldSkipPackage(_config) {
		return false;
	}
	hasValidRepository(repository) {
		return repository.split("/").length === 2;
	}
	/**
	* Build the URL to the changelog markdown file for the release notes.
	* Platform sources can override this to match their web UI conventions.
	*/
	getNotesSourceUrl(baseUrl, repository, changelogFile) {
		return joinUrlParts(baseUrl, repository, "blob", "HEAD", changelogFile);
	}
	/**
	* Build the URL pointing to a specific heading within the changelog markdown
	* file. Platform sources can override this to match their anchor conventions.
	*/
	getReleaseNotesMdAnchorUrl(notesSourceUrl, heading) {
		return `${notesSourceUrl}#${heading.replace(regEx(/[[\]()]/g), " ").replace(regEx(/^\s*#*\s*/), "").split(" ").filter(isTruthy).filter((word) => !isHttpUrl(word)).join("-").replace(regEx(/[^A-Za-z0-9-]/g), "")}`;
	}
};
//#endregion
export { ChangeLogSource };

//# sourceMappingURL=source.js.map