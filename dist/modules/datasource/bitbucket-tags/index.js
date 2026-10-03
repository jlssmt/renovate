import { ensureTrailingSlash } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { BitbucketHttp } from "../../../util/http/bitbucket.js";
import { RepoInfo } from "../../platform/bitbucket/schema.js";
import { BitbucketCommits, BitbucketTag, BitbucketTags } from "./schema.js";
//#region lib/modules/datasource/bitbucket-tags/index.ts
var BitbucketTagsDatasource = class BitbucketTagsDatasource extends Datasource {
	static id = "bitbucket-tags";
	bitbucketHttp = new BitbucketHttp(BitbucketTagsDatasource.id);
	static defaultRegistryUrls = ["https://bitbucket.org"];
	static cacheNamespace = `datasource-${BitbucketTagsDatasource.id}`;
	constructor() {
		super(BitbucketTagsDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return BitbucketTagsDatasource.defaultRegistryUrls;
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `date` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	static getRegistryURL(registryUrl) {
		return registryUrl ?? this.defaultRegistryUrls[0];
	}
	static getCacheKey(registryUrl, repo, type) {
		return `${BitbucketTagsDatasource.getRegistryURL(registryUrl)}:${repo}:${type}`;
	}
	static getSourceUrl(packageName, registryUrl) {
		const url = BitbucketTagsDatasource.getRegistryURL(registryUrl);
		return `${ensureTrailingSlash(url)}${packageName}`;
	}
	async _getReleases({ registryUrl, packageName: repo }) {
		const url = `/2.0/repositories/${repo}/refs/tags`;
		const bitbucketTags = (await this.bitbucketHttp.getJson(url, { paginate: true }, BitbucketTags)).body;
		return {
			sourceUrl: BitbucketTagsDatasource.getSourceUrl(repo, registryUrl),
			registryUrl: BitbucketTagsDatasource.getRegistryURL(registryUrl),
			releases: bitbucketTags.map(({ name, target }) => ({
				version: name,
				gitRef: name,
				releaseTimestamp: asTimestamp(target?.date)
			}))
		};
	}
	getReleases(config) {
		return withCache({
			namespace: BitbucketTagsDatasource.cacheNamespace,
			key: BitbucketTagsDatasource.getCacheKey(config.registryUrl, config.packageName, "tags"),
			fallback: true
		}, () => this._getReleases(config));
	}
	async _getTagCommit(_registryUrl, repo, tag) {
		const url = `/2.0/repositories/${repo}/refs/tags/${tag}`;
		return (await this.bitbucketHttp.getJson(url, BitbucketTag)).body.target?.hash ?? null;
	}
	getTagCommit(registryUrl, repo, tag) {
		return withCache({
			namespace: BitbucketTagsDatasource.cacheNamespace,
			key: BitbucketTagsDatasource.getCacheKey(registryUrl, repo, `tag-${tag}`)
		}, () => this._getTagCommit(registryUrl, repo, tag));
	}
	async _getMainBranch(_registryUrl, repo) {
		return (await this.bitbucketHttp.getJson(`/2.0/repositories/${repo}`, RepoInfo)).body.mainbranch;
	}
	getMainBranch(registryUrl, repo) {
		return withCache({
			namespace: BitbucketTagsDatasource.cacheNamespace,
			key: BitbucketTagsDatasource.getCacheKey(registryUrl, repo, "mainbranch"),
			ttlMinutes: 60
		}, () => this._getMainBranch(registryUrl, repo));
	}
	async _getDigest({ packageName: repo, registryUrl }, newValue) {
		if (newValue?.length) return this.getTagCommit(registryUrl, repo, newValue);
		const url = `/2.0/repositories/${repo}/commits/${await this.getMainBranch(BitbucketTagsDatasource.getRegistryURL(registryUrl), repo)}`;
		const bitbucketCommits = (await this.bitbucketHttp.getJson(url, BitbucketCommits)).body;
		if (bitbucketCommits.length === 0) return null;
		return bitbucketCommits[0].hash;
	}
	getDigest(config, newValue) {
		return withCache({
			namespace: BitbucketTagsDatasource.cacheNamespace,
			key: BitbucketTagsDatasource.getCacheKey(config.registryUrl, config.packageName, "digest"),
			fallback: true
		}, () => this._getDigest(config, newValue));
	}
};
//#endregion
export { BitbucketTagsDatasource };

//# sourceMappingURL=index.js.map