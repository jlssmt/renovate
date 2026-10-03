import { logger } from "../../../logger/index.js";
import { getQueryString, joinUrlParts } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { OrbPackagesResponse } from "./schema.js";
//#region lib/modules/datasource/orb/index.ts
var OrbDatasource = class OrbDatasource extends Datasource {
	static id = "orb";
	constructor() {
		super(OrbDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://circleci.com/"];
	}
	registryStrategy = "hunt";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created_at` field in the results.";
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const url = `${joinUrlParts(registryUrl, "api/v3/orb/packages")}?${getQueryString({ "filter[name]": packageName })}`;
		try {
			const { body } = await this.http.getJson(url, OrbPackagesResponse);
			const pkg = body.data[0];
			if (!pkg) {
				logger.debug({ packageName }, `Failed to look up orb ${packageName}`);
				return null;
			}
			const dep = {
				homepage: pkg.homeUrl?.length ? pkg.homeUrl : `https://circleci.com/developer/orbs/orb/${packageName}`,
				isPrivate: pkg.isPrivate,
				releases: pkg.releases
			};
			logger.trace({ dep }, "dep");
			return dep;
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${OrbDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { OrbDatasource };

//# sourceMappingURL=index.js.map