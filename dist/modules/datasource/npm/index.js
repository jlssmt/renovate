import "../../versioning/npm/index.js";
import { Datasource } from "../datasource.js";
import { defaultRegistryUrl } from "./common.js";
import { getDependency } from "./get.js";
import { setNpmrc } from "./npmrc.js";
//#region lib/modules/datasource/npm/index.ts
var NpmDatasource = class NpmDatasource extends Datasource {
	static id = "npm";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "first";
	defaultVersioning = "npm";
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `time` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `repository` field in the results.";
	constructor() {
		super(NpmDatasource.id);
	}
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		return await getDependency(this.http, registryUrl, packageName);
	}
};
//#endregion
export { NpmDatasource, setNpmrc };

//# sourceMappingURL=index.js.map