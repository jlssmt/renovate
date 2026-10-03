import { logger } from "../../../logger/index.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { getApiBaseUrl, getSourceUrl } from "../../../util/github/url.js";
import { queryReleases, queryTags } from "../../../util/github/graphql/index.js";
import { findCommitOfTag } from "../../../util/github/tags.js";
import { isBoolean, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/github-tags/index.ts
var GithubTagsDatasource = class GithubTagsDatasource extends Datasource {
	static id = "github-tags";
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com"];
	}
	registryStrategy = "hunt";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The get release timestamp is determined from the `releaseTimestamp` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	http;
	constructor() {
		super(GithubTagsDatasource.id);
		this.http = new GithubHttp(GithubTagsDatasource.id);
	}
	async getCommit(registryUrl, githubRepo) {
		const apiBaseUrl = getApiBaseUrl(registryUrl);
		let digest = null;
		try {
			const url = `${apiBaseUrl}repos/${githubRepo}/commits?per_page=1`;
			digest = (await this.http.getJsonUnchecked(url, { cacheProvider: memCacheProvider })).body[0].sha;
		} catch (err) {
			logger.debug({
				githubRepo,
				err,
				registryUrl
			}, "Error getting latest commit from GitHub repo");
		}
		return digest;
	}
	/**
	* github.getDigest
	*
	* The `newValue` supplied here should be a valid tag for the docker image.
	*
	* Returns the latest commit hash for the repository.
	*/
	getDigest({ packageName: repo, registryUrl }, newValue) {
		return newValue ? findCommitOfTag(registryUrl, repo, newValue, this.http) : this.getCommit(registryUrl, repo);
	}
	async getReleases(config) {
		const { registryUrl, packageName: repo } = config;
		const sourceUrl = getSourceUrl(repo, registryUrl);
		const releases = (await queryTags(config, this.http)).map(({ version, releaseTimestamp, gitRef, hash }) => ({
			newDigest: hash,
			version,
			releaseTimestamp,
			gitRef
		}));
		try {
			const releasesResult = await queryReleases(config, this.http);
			const releasesMap = /* @__PURE__ */ new Map();
			for (const release of releasesResult) releasesMap.set(release.version, release);
			for (const release of releases) {
				const isReleaseStable = releasesMap.get(release.version)?.isStable;
				if (isBoolean(isReleaseStable)) release.isStable = isReleaseStable;
				const releaseTimestamp = releasesMap.get(release.version)?.releaseTimestamp;
				if (releaseTimestamp && (isNullOrUndefined(release.releaseTimestamp) || releaseTimestamp > release.releaseTimestamp)) release.releaseTimestamp = releaseTimestamp;
			}
		} catch (err) /* istanbul ignore next */ {
			logger.debug({ err }, `Error fetching additional info for GitHub tags`);
		}
		return {
			sourceUrl,
			releases
		};
	}
};
//#endregion
export { GithubTagsDatasource };

//# sourceMappingURL=index.js.map