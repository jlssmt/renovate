import { joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/node/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { datasource, defaultRegistryUrl } from "./common.js";
import { NodeReleases } from "./schema.js";
//#region lib/modules/datasource/node-version/index.ts
var NodeVersionDatasource = class extends Datasource {
	static id = datasource;
	constructor() {
		super(datasource);
	}
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `date` field.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL: https://github.com/nodejs/node";
	async fetchReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const result = {
			homepage: "https://nodejs.org",
			sourceUrl: "https://github.com/nodejs/node",
			registryUrl,
			releases: []
		};
		try {
			const resp = await this.http.getJson(joinUrlParts(registryUrl, "index.json"), NodeReleases);
			result.releases.push(...resp.body.map(({ version, date, lts }) => ({
				version,
				releaseTimestamp: asTimestamp(date),
				isStable: lts !== false
			})));
		} catch (err) {
			this.handleGenericErrors(err);
		}
		return result.releases.length ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { NodeVersionDatasource };

//# sourceMappingURL=index.js.map