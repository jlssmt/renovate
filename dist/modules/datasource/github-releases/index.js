import { logger } from "../../../logger/index.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { getSourceUrl } from "../../../util/github/url.js";
import { queryReleases } from "../../../util/github/graphql/index.js";
import { findCommitOfTag } from "../../../util/github/tags.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/modules/datasource/github-releases/index.ts
var GithubReleasesDatasource = class GithubReleasesDatasource extends Datasource {
	static id = "github-releases";
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com"];
	}
	http;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `releaseTimestamp` field from the response.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	constructor() {
		super(GithubReleasesDatasource.id);
		this.http = new GithubHttp(GithubReleasesDatasource.id);
	}
	/**
	* Attempts to resolve the digest for the specified package.
	*
	* The `newValue` supplied here should be a valid tag for the GitHub release. The digest
	* of a GitHub release will be the underlying SHA of the release tag.
	*
	* Some managers like Bazel will deal with individual artifacts from releases and handle
	* the artifact checksum computation separately. This data-source does not know about
	* specific artifacts being used, as that could vary per manager
	*/
	getDigest({ packageName: repo, currentValue, currentDigest, registryUrl }, newValue) {
		logger.debug({
			repo,
			currentValue,
			currentDigest,
			registryUrl,
			newValue
		}, "getDigest");
		return findCommitOfTag(registryUrl, repo, newValue, this.http);
	}
	/**
	* This function can be used to fetch releases with a customizable versioning
	* (e.g. semver) and with releases.
	*
	* This function will:
	*  - Fetch all releases
	*  - Sanitize the versions if desired (e.g. strip out leading 'v')
	*  - Return a dependency object containing sourceUrl string and releases array
	*/
	async getReleases(config) {
		const releases = (await queryReleases(config, this.http)).map((item) => {
			const { version, releaseTimestamp, isStable } = item;
			const result = {
				version,
				gitRef: version,
				releaseTimestamp
			};
			if (isBoolean(isStable)) result.isStable = isStable;
			return result;
		});
		return {
			sourceUrl: getSourceUrl(config.packageName, config.registryUrl),
			releases
		};
	}
};
//#endregion
export { GithubReleasesDatasource };

//# sourceMappingURL=index.js.map