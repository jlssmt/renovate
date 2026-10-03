import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/nuget/index.js";
import { Datasource } from "../datasource.js";
import { isCrossOriginPaginationAllowed } from "../util.js";
import { parseRegistryUrl } from "./common.js";
import { NugetV2Api } from "./v2.js";
import { NugetV3Api } from "./v3.js";
//#region lib/modules/datasource/nuget/index.ts
const nugetOrg = "https://api.nuget.org/v3/index.json";
var NugetDatasource = class NugetDatasource extends Datasource {
	static id = "nuget";
	getDefaultRegistryUrls(_packageName) {
		return [nugetOrg];
	}
	defaultVersioning = id;
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "For the v2 API, the release timestamp is determined from the `Published` tag. And, for the v3 API, the release timestamp is determined from the `published` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "For the v2 API, the source URL is determined from the `ProjectUrl` tag. And, for the v3 API, the source URL is determined from the `metadata.repository@url` field in the results.";
	v2Api = new NugetV2Api();
	v3Api = new NugetV3Api();
	constructor() {
		super(NugetDatasource.id);
	}
	async getReleases({ packageName, registryUrl }) {
		logger.trace(`nuget.getReleases(${packageName})`);
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const { feedUrl, protocolVersion } = parseRegistryUrl(registryUrl);
		if (protocolVersion === 2) return this.v2Api.getReleases(this.http, feedUrl, packageName, isCrossOriginPaginationAllowed(NugetDatasource.id));
		if (protocolVersion === 3) {
			const queryUrl = await this.v3Api.getResourceUrl(this.http, feedUrl);
			if (queryUrl) return this.v3Api.getReleases(this.http, feedUrl, queryUrl, packageName);
		}
		return null;
	}
};
//#endregion
export { NugetDatasource, nugetOrg };

//# sourceMappingURL=index.js.map