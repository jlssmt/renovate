import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Result } from "../../../util/result.js";
import { Datasource } from "../datasource.js";
import { BitbucketServerHttp } from "../../../util/http/bitbucket-server.js";
import { DigestsConfig, ReleasesConfig } from "../schema.js";
import { BitbucketServerCommits, BitbucketServerTag, BitbucketServerTags } from "./schema.js";
import { ZodError } from "zod/v4";
//#region lib/modules/datasource/bitbucket-server-tags/index.ts
var BitbucketServerTagsDatasource = class BitbucketServerTagsDatasource extends Datasource {
	static id = "bitbucket-server-tags";
	http = new BitbucketServerHttp(BitbucketServerTagsDatasource.id);
	static cacheNamespace = `datasource-${BitbucketServerTagsDatasource.id}`;
	constructor() {
		super(BitbucketServerTagsDatasource.id);
	}
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	static getRegistryURL(registryUrl) {
		return registryUrl?.replace(regEx(/\/rest\/api\/1.0$/), "");
	}
	static getSourceUrl(projectKey, repositorySlug, registryUrl) {
		const url = BitbucketServerTagsDatasource.getRegistryURL(registryUrl);
		return `${ensureTrailingSlash(url)}projects/${projectKey}/repos/${repositorySlug}`;
	}
	static getApiUrl(registryUrl) {
		const res = BitbucketServerTagsDatasource.getRegistryURL(registryUrl);
		return `${ensureTrailingSlash(res)}rest/api/1.0/`;
	}
	static getCacheKey(registryUrl, repo, type) {
		return `${BitbucketServerTagsDatasource.getRegistryURL(registryUrl ?? "")}:${repo}:${type}`;
	}
	async _getReleases(config) {
		const { registryUrl, packageName } = config;
		const [projectKey, repositorySlug] = packageName.split("/");
		if (!registryUrl) {
			logger.debug("Missing registryUrl");
			return null;
		}
		const { val, err } = await Result.parse(config, ReleasesConfig).transform(({ registryUrl }) => {
			const url = `${BitbucketServerTagsDatasource.getApiUrl(registryUrl)}projects/${projectKey}/repos/${repositorySlug}/tags`;
			return this.http.getJsonSafe(url, { paginate: true }, BitbucketServerTags);
		}).transform((tags) => tags.map(({ displayId, hash }) => ({
			version: displayId,
			gitRef: displayId,
			newDigest: hash ?? void 0
		}))).transform((versions) => {
			return {
				sourceUrl: BitbucketServerTagsDatasource.getSourceUrl(projectKey, repositorySlug, registryUrl),
				registryUrl: BitbucketServerTagsDatasource.getRegistryURL(registryUrl),
				releases: versions
			};
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "bitbucket-server-tags: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getReleases(config) {
		return withCache({
			namespace: BitbucketServerTagsDatasource.cacheNamespace,
			key: BitbucketServerTagsDatasource.getCacheKey(config.registryUrl, config.packageName, "tags"),
			fallback: true
		}, () => this._getReleases(config));
	}
	async _getTagCommit(baseUrl, tag) {
		return (await this.http.getJson(`${baseUrl}/tags/${tag}`, BitbucketServerTag)).body.hash ?? null;
	}
	getTagCommit(baseUrl, tag, config) {
		return withCache({
			namespace: BitbucketServerTagsDatasource.cacheNamespace,
			key: BitbucketServerTagsDatasource.getCacheKey(config.registryUrl, config.packageName, `tag-${tag}`)
		}, () => this._getTagCommit(baseUrl, tag));
	}
	async _getDigest(config, newValue) {
		const { registryUrl, packageName } = config;
		const [projectKey, repositorySlug] = packageName.split("/");
		if (!registryUrl) {
			logger.debug("Missing registryUrl");
			return null;
		}
		const baseUrl = `${BitbucketServerTagsDatasource.getApiUrl(registryUrl)}projects/${projectKey}/repos/${repositorySlug}`;
		if (newValue?.length) return this.getTagCommit(baseUrl, newValue, config);
		const { val = null, err } = await Result.parse(config, DigestsConfig).transform(() => {
			const url = `${baseUrl}/commits?ignoreMissing=true`;
			return this.http.getJsonSafe(url, {
				paginate: true,
				limit: 1,
				maxPages: 1
			}, BitbucketServerCommits);
		}).transform((commits) => {
			return commits[0]?.id;
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "bitbucket-server-tags: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getDigest(config, newValue) {
		return withCache({
			namespace: BitbucketServerTagsDatasource.cacheNamespace,
			key: BitbucketServerTagsDatasource.getCacheKey(config.registryUrl, config.packageName, "digest"),
			fallback: true
		}, () => this._getDigest(config, newValue));
	}
};
//#endregion
export { BitbucketServerTagsDatasource };

//# sourceMappingURL=index.js.map