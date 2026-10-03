import { joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/perl/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { MetaCpanApiFileSearchResponse } from "./schema.js";
//#region lib/modules/datasource/cpan/index.ts
var CpanDatasource = class CpanDatasource extends Datasource {
	static id = "cpan";
	constructor() {
		super(CpanDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://fastapi.metacpan.org/"];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `date` field in the results.";
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		let result = null;
		const searchUrl = joinUrlParts(registryUrl, "v1/file/_search");
		let releases = null;
		try {
			const body = {
				query: { bool: { filter: [
					{ term: { "module.name": packageName } },
					{ term: { "module.authorized": true } },
					{ exists: { field: "module.associated_pod" } }
				] } },
				_source: [
					"module.name",
					"module.version",
					"distribution",
					"date",
					"deprecated",
					"maturity",
					"status"
				],
				sort: [{ date: "desc" }]
			};
			releases = (await this.http.postJson(searchUrl, { body }, MetaCpanApiFileSearchResponse)).body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
		let latestDistribution = null;
		let latestVersion = null;
		// v8 ignore else -- unreachable
		if (releases) for (const release of releases) {
			latestDistribution ??= release.distribution;
			if (!latestVersion && release.isLatest) latestVersion = release.version;
		}
		if (releases.length > 0 && latestDistribution) {
			result = {
				releases,
				changelogUrl: `https://metacpan.org/dist/${latestDistribution}/changes`,
				homepage: `https://metacpan.org/pod/${packageName}`
			};
			if (latestVersion) {
				result.tags ??= {};
				result.tags.latest = latestVersion;
			}
		}
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${CpanDatasource.id}`,
			key: `${config.packageName}`,
			cacheable: true,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { CpanDatasource };

//# sourceMappingURL=index.js.map