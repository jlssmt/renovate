import { parseUrl } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { GiteaHttp } from "../../../util/http/gitea.js";
import { Commits, Tag } from "./schema.js";
import { getApiUrl, getCacheKey, getSourceUrl } from "./util.js";
//#region lib/modules/datasource/gitea-tags/base.ts
/**
* Shared implementation of the datasources which speak the Gitea API.
*
* Forgejo is a fork of Gitea and serves the same API, so the Forgejo
* datasources extend the Gitea ones and only differ in their id, their default
* registry URL and their cache namespace. The digest lookup and the caching of
* `getReleases()` are the same for tags and releases, so they live here and a
* subclass only fetches and maps the releases of its own endpoint.
*/
var GiteaDatasource = class GiteaDatasource extends Datasource {
	static defaultRegistryUrls = ["https://gitea.com"];
	getDefaultRegistryUrls(_packageName) {
		return GiteaDatasource.defaultRegistryUrls;
	}
	http = new GiteaHttp(this.id);
	releaseTimestampSupport = true;
	releaseTimestampNote;
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	/** Discriminates the cache keys of the two endpoints. */
	cacheKeyType;
	/**
	* @param endpoint describes the endpoint `getReleases()` reads: the
	* discriminator of its cache keys, and the field the release timestamp comes
	* from, which is rendered into the generated documentation.
	*/
	constructor(id, endpoint) {
		super(id);
		this.cacheKeyType = endpoint.cacheKeyType;
		this.releaseTimestampNote = `The release timestamp is determined from the \`${endpoint.releaseTimestampField}\` field in the results.`;
	}
	static getSourceUrl(packageName, registryUrl) {
		return getSourceUrl(packageName, registryUrl ?? this.defaultRegistryUrls[0]);
	}
	/** Falls back to the default registry URL when none is configured. */
	getRegistryUrl(registryUrl) {
		return registryUrl ?? this.getDefaultRegistryUrls("")[0];
	}
	/**
	* Only results from the public default instance may be written to the
	* shared package cache; a self-hosted instance may serve private
	* repositories.
	*/
	isPublicRegistry(registryUrl) {
		return parseUrl(registryUrl)?.hostname === parseUrl(this.getDefaultRegistryUrls("")[0])?.hostname;
	}
	getReleases({ registryUrl, packageName: repo }) {
		const resolvedUrl = this.getRegistryUrl(registryUrl);
		return withCache({
			namespace: this.cacheNamespace,
			key: getCacheKey(resolvedUrl, repo, this.cacheKeyType),
			fallback: true,
			cacheable: this.isPublicRegistry(resolvedUrl)
		}, () => this._getReleases(resolvedUrl, repo));
	}
	async _getTagCommit(registryUrl, repo, tag) {
		const url = `${getApiUrl(registryUrl)}repos/${repo}/tags/${tag}`;
		const { body } = await this.http.getJson(url, Tag);
		return body.commit.sha;
	}
	getTagCommit(registryUrl, repo, tag) {
		const resolvedUrl = this.getRegistryUrl(registryUrl);
		return withCache({
			namespace: this.cacheNamespace,
			key: getCacheKey(resolvedUrl, repo, `tag-${tag}`),
			cacheable: this.isPublicRegistry(resolvedUrl)
		}, () => this._getTagCommit(resolvedUrl, repo, tag));
	}
	async _getDigest(registryUrl, repo, newValue) {
		if (newValue?.length) return this.getTagCommit(registryUrl, repo, newValue);
		const url = `${getApiUrl(registryUrl)}repos/${repo}/commits?stat=false&verification=false&files=false&page=1&limit=1`;
		const { body } = await this.http.getJson(url, Commits);
		if (body.length === 0) return null;
		return body[0].sha;
	}
	getDigest({ packageName: repo, registryUrl }, newValue) {
		const resolvedUrl = this.getRegistryUrl(registryUrl);
		return withCache({
			namespace: this.cacheNamespace,
			key: getCacheKey(resolvedUrl, repo, "digest"),
			fallback: true,
			cacheable: this.isPublicRegistry(resolvedUrl)
		}, () => this._getDigest(resolvedUrl, repo, newValue));
	}
};
//#endregion
export { GiteaDatasource };

//# sourceMappingURL=base.js.map