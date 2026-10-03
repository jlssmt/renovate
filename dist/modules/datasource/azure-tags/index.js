import { ensureTrailingSlash } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { gitApi } from "../../platform/azure/azure-got-wrapper.js";
//#region lib/modules/datasource/azure-tags/index.ts
var AzureTagsDatasource = class AzureTagsDatasource extends Datasource {
	static id = "azure-tags";
	static cacheNamespace = `datasource-${AzureTagsDatasource.id}`;
	constructor() {
		super(AzureTagsDatasource.id);
	}
	static getCacheKey(registryUrl, repo, type) {
		return `${registryUrl}:${repo}:${type}`;
	}
	static getSourceUrl(packageName, registryUrl) {
		return `${ensureTrailingSlash(registryUrl)}_git/${packageName}`;
	}
	async _getReleases({ registryUrl, packageName: repo }) {
		const filteredTags = (await (await gitApi()).getRefs(repo, void 0, "tags")).filter((tag) => tag.name);
		return {
			sourceUrl: AzureTagsDatasource.getSourceUrl(repo, registryUrl),
			registryUrl,
			releases: filteredTags.map((tag) => ({
				version: tag.name,
				gitRef: tag.name,
				releaseTimestamp: null
			}))
		};
	}
	getReleases(config) {
		return withCache({
			namespace: AzureTagsDatasource.cacheNamespace,
			key: AzureTagsDatasource.getCacheKey(config.registryUrl, config.packageName, "tags"),
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { AzureTagsDatasource };

//# sourceMappingURL=index.js.map