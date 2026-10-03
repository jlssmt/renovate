import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/semver-coerced/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { PackageHttpCacheProvider } from "../../../util/http/cache/package-http-cache-provider.js";
import { Registry } from "./schema.js";
//#region lib/modules/datasource/typst/index.ts
var TypstDatasource = class TypstDatasource extends Datasource {
	static id = "typst";
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://packages.typst.org/preview/index.json"];
	}
	defaultVersioning = id;
	constructor() {
		super(TypstDatasource.id);
	}
	async _getReleases({ packageName }) {
		const [, pkg] = packageName.split("/");
		const [registryUrl] = this.getDefaultRegistryUrls("");
		const cacheProvider = new PackageHttpCacheProvider({
			namespace: "datasource-typst:cache-provider",
			checkAuthorizationHeader: false,
			checkCacheControlHeader: false
		});
		const { body: registry } = await this.http.getJson(registryUrl, { cacheProvider }, Registry);
		const result = registry[pkg];
		if (!result) return null;
		result.registryUrl = registryUrl;
		return result;
	}
	async getReleases(config) {
		const [namespace] = config.packageName.split("/");
		if (namespace !== "preview") {
			logger.debug(`Unsupported namespace for @${config.packageName}`);
			return null;
		}
		return withCache({
			namespace: `datasource-${TypstDatasource.id}:registry-releases`,
			key: config.packageName,
			fallback: true,
			cacheable: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { TypstDatasource };

//# sourceMappingURL=index.js.map