import { coerceObject } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/semver/index.js";
import { get, set } from "../../../util/cache/package/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { DenoAPIModuleResponse, DenoAPIModuleVersionResponse } from "./schema.js";
import { isNullOrUndefined } from "@sindresorhus/is";
import pMap from "p-map";
//#region lib/modules/datasource/deno/index.ts
var DenoDatasource = class DenoDatasource extends Datasource {
	static id = "deno";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "first";
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return ["https://apiland.deno.dev"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `uploaded_at` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `repository` field in the results.";
	constructor() {
		super(DenoDatasource.id);
	}
	async _getReleases({ packageName, registryUrl }) {
		const massagedRegistryUrl = registryUrl;
		const rawPackageName = regEx(/^(?:https:\/\/deno.land\/)(?<rawPackageName>[^@\s]+)/).exec(packageName)?.groups?.rawPackageName;
		if (isNullOrUndefined(rawPackageName)) {
			logger.debug(`Could not extract rawPackageName from packageName: "${packageName}"`);
			return null;
		}
		const massagedPackageName = rawPackageName.replace("x/", "");
		const moduleAPIURL = joinUrlParts(massagedRegistryUrl, "v2/modules", massagedPackageName);
		return await this.getReleaseResult(moduleAPIURL);
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${DenoDatasource.id}`,
			key: `getReleases:${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
	async _getReleaseResult(moduleAPIURL) {
		const detailsCacheKey = `details:${moduleAPIURL}`;
		const releasesCache = coerceObject(await get(`datasource-${DenoDatasource.id}`, detailsCacheKey));
		let cacheModified = false;
		const { body: { versions, tags } } = await this.http.getJson(moduleAPIURL, DenoAPIModuleResponse);
		const releases = await pMap(versions, async (version) => {
			const cacheRelease = releasesCache[version];
			/* v8 ignore next: hard to test */
			if (cacheRelease) return cacheRelease;
			const url = joinUrlParts(moduleAPIURL, version);
			const { body: release } = await this.http.getJson(url, DenoAPIModuleVersionResponse.catch(({ error: err }) => {
				logger.warn({
					err,
					version
				}, "Deno: failed to get version details");
				return { version };
			}));
			releasesCache[release.version] = release;
			cacheModified = true;
			return release;
		}, { concurrency: 5 });
		// v8 ignore else -- needs every release already present in the cache
		if (cacheModified) await set(`datasource-${DenoDatasource.id}`, detailsCacheKey, releasesCache, 10080);
		return {
			releases,
			tags
		};
	}
	getReleaseResult(moduleAPIURL) {
		return withCache({
			namespace: `datasource-${DenoDatasource.id}`,
			key: `getReleaseResult:${moduleAPIURL}`
		}, () => this._getReleaseResult(moduleAPIURL));
	}
};
//#endregion
export { DenoDatasource };

//# sourceMappingURL=index.js.map