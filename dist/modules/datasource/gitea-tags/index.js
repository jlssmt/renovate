import { Tags } from "./schema.js";
import { getApiUrl, getSourceUrl } from "./util.js";
import { GiteaDatasource } from "./base.js";
//#region lib/modules/datasource/gitea-tags/index.ts
var GiteaTagsDatasource = class GiteaTagsDatasource extends GiteaDatasource {
	static id = "gitea-tags";
	cacheNamespace = "datasource-gitea-tags";
	/** Subclasses for other Gitea-compatible hosts pass their own id. */
	constructor(id = GiteaTagsDatasource.id) {
		super(id, {
			cacheKeyType: "tags",
			releaseTimestampField: "created"
		});
	}
	async _getReleases(registryUrl, repo) {
		const url = `${getApiUrl(registryUrl)}repos/${repo}/tags`;
		const tags = (await this.http.getJson(url, { paginate: true }, Tags)).body;
		return {
			sourceUrl: getSourceUrl(repo, registryUrl),
			registryUrl,
			releases: tags.map(({ name, commit }) => ({
				version: name,
				gitRef: name,
				newDigest: commit.sha,
				releaseTimestamp: commit.created
			}))
		};
	}
};
//#endregion
export { GiteaTagsDatasource };

//# sourceMappingURL=index.js.map