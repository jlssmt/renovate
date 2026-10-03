import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import "../../versioning/elm/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { ElmPackageReleases } from "./schema.js";
import { ZodError } from "zod/v4";
//#region lib/modules/datasource/elm-package/index.ts
var ElmPackageDatasource = class ElmPackageDatasource extends Datasource {
	static id = "elm-package";
	constructor() {
		super(ElmPackageDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://package.elm-lang.org"];
	}
	defaultVersioning = "elm";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the Unix timestamp in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the package name using the GitHub pattern.";
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore if -- should never happen */
		if (!registryUrl) return null;
		const pkgUrl = joinUrlParts(registryUrl, "packages", packageName, "releases.json");
		const { val: result, err } = await this.http.getJsonSafe(pkgUrl, ElmPackageReleases).onError((err) => {
			logger.debug({
				url: pkgUrl,
				datasource: ElmPackageDatasource.id,
				packageName,
				err
			}, "Error fetching elm package releases");
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "elm-package: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		if (packageName.includes("/")) result.sourceUrl = `https://github.com/${packageName}`;
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${ElmPackageDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true,
			cacheable: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { ElmPackageDatasource };

//# sourceMappingURL=index.js.map