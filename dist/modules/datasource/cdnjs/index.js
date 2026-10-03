import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Result } from "../../../util/result.js";
import { Datasource } from "../datasource.js";
import { DigestsConfig, ReleasesConfig } from "../schema.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { CdnjsAPISriResponse, CdnjsAPIVersionResponse } from "./schema.js";
import { ZodError } from "zod/v4";
//#region lib/modules/datasource/cdnjs/index.ts
var CdnjsDatasource = class CdnjsDatasource extends Datasource {
	static id = "cdnjs";
	constructor() {
		super(CdnjsDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://api.cdnjs.com/"];
	}
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `repository` field in the results.";
	async _getReleases(config) {
		const { val, err } = await Result.parse(config, ReleasesConfig).transform(({ packageName, registryUrl }) => {
			const [library] = packageName.split("/");
			const url = `${registryUrl}libraries/${library}?fields=homepage,repository,versions`;
			return this.http.getJsonSafe(url, { cacheProvider: memCacheProvider }, CdnjsAPIVersionResponse);
		}).transform(({ versions, homepage, repository }) => {
			const res = { releases: versions };
			if (homepage) res.homepage = homepage;
			if (repository) res.sourceUrl = repository;
			return res;
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "cdnjs: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getReleases(config) {
		const library = config.packageName.split("/")[0];
		return withCache({
			namespace: `datasource-${CdnjsDatasource.id}`,
			key: `getReleases:${library}`,
			cacheable: true,
			fallback: true
		}, () => this._getReleases(config));
	}
	async _getDigest(config, newValue) {
		const { packageName } = config;
		const [library] = packageName.split("/");
		const assetName = packageName.replace(`${library}/`, "");
		const { val = null, err } = await Result.parse(config, DigestsConfig).transform(({ registryUrl }) => {
			const url = `${registryUrl}libraries/${library}/${newValue}?fields=sri`;
			return this.http.getJsonSafe(url, CdnjsAPISriResponse);
		}).transform(({ sri }) => {
			return sri?.[assetName];
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "cdnjs: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getDigest(config, newValue) {
		return withCache({
			namespace: `datasource-${CdnjsDatasource.id}`,
			key: `getDigest:${config.registryUrl}:${config.packageName}:${newValue}`,
			cacheable: true,
			fallback: true
		}, () => this._getDigest(config, newValue));
	}
	handleHttpErrors(err) {
		if (err.response?.statusCode !== 404) throw new ExternalHostError(err);
	}
};
//#endregion
export { CdnjsDatasource };

//# sourceMappingURL=index.js.map