import { getApiUrl, getSourceUrl } from "../gitea-tags/util.js";
import { GiteaDatasource } from "../gitea-tags/base.js";
import { Releases } from "./schema.js";
//#region lib/modules/datasource/gitea-releases/index.ts
var GiteaReleasesDatasource = class GiteaReleasesDatasource extends GiteaDatasource {
	static id = "gitea-releases";
	cacheNamespace = "datasource-gitea-releases";
	/** Subclasses for other Gitea-compatible hosts pass their own id. */
	constructor(id = GiteaReleasesDatasource.id) {
		super(id, {
			cacheKeyType: "releases",
			releaseTimestampField: "published_at"
		});
	}
	async _getReleases(registryUrl, repo) {
		const url = `${getApiUrl(registryUrl)}repos/${repo}/releases?draft=false`;
		const releases = (await this.http.getJson(url, { paginate: true }, Releases)).body;
		return {
			sourceUrl: getSourceUrl(repo, registryUrl),
			registryUrl,
			releases: releases.map(({ tag_name, published_at, prerelease }) => ({
				version: tag_name,
				gitRef: tag_name,
				releaseTimestamp: published_at,
				isStable: !prerelease
			}))
		};
	}
};
//#endregion
export { GiteaReleasesDatasource };

//# sourceMappingURL=index.js.map