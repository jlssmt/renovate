import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { Datasource } from "../datasource.js";
import { datasource, registryUrl } from "./common.js";
import { EndoflifeDateVersions } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/endoflife-date/index.ts
var EndoflifeDateDatasource = class EndoflifeDateDatasource extends Datasource {
	static id = datasource;
	getDefaultRegistryUrls(_packageName) {
		return [registryUrl];
	}
	defaultVersioning = "loose";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `releaseDate` field in the results.";
	constructor() {
		super(EndoflifeDateDatasource.id);
	}
	async fetchReleases({ registryUrl, packageName }) {
		if (!isNonEmptyString(registryUrl)) return null;
		logger.trace(`${datasource}.getReleases(${registryUrl}, ${packageName})`);
		const result = { releases: [] };
		const url = joinUrlParts(registryUrl, `${packageName}.json`);
		try {
			const response = await this.http.getJson(url, EndoflifeDateVersions);
			result.releases.push(...response.body);
			return result.releases.length ? result : null;
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { EndoflifeDateDatasource };

//# sourceMappingURL=index.js.map