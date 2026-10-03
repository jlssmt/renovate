import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/semver/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { defaultRegistryUrls } from "./common.js";
import { JsrPackageMetadata } from "./schema.js";
import { extractJsrPackageName } from "./util.js";
import { isNull } from "@sindresorhus/is";
//#region lib/modules/datasource/jsr/index.ts
var JsrDatasource = class JsrDatasource extends Datasource {
	static id = "jsr";
	supportsCustomRegistry(_packageName) {
		return false;
	}
	registryStrategy = "first";
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return defaultRegistryUrls;
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `createdAt` field in the results. For packages without explicit timestamps, defaults to 2025-09-18.";
	constructor() {
		super(JsrDatasource.id);
	}
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const validJsrPackageName = extractJsrPackageName(packageName);
		if (isNull(validJsrPackageName)) {
			logger.debug(`Could not extract packageName: "${packageName}"`);
			return null;
		}
		const packageInfoUrl = joinUrlParts(registryUrl, packageName, "meta.json");
		const result = {
			homepage: joinUrlParts(registryUrl, packageName),
			registryUrl,
			releases: []
		};
		try {
			const { body } = await this.http.getJson(packageInfoUrl, JsrPackageMetadata);
			result.releases.push(...body);
		} catch (err) {
			logger.warn({ err }, "JSR: failed to get package details");
			this.handleGenericErrors(err);
		}
		return result.releases.length ? result : null;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${JsrDatasource.id}`,
			key: `getReleases:${config.registryUrl}:${config.packageName}`,
			cacheable: true,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { JsrDatasource };

//# sourceMappingURL=index.js.map