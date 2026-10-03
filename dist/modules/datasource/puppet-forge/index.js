import { Datasource } from "../datasource.js";
import { PUPPET_FORGE } from "./common.js";
import { PuppetModule } from "./schema.js";
//#region lib/modules/datasource/puppet-forge/index.ts
var PuppetForgeDatasource = class PuppetForgeDatasource extends Datasource {
	static id = "puppet-forge";
	constructor() {
		super(PuppetForgeDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return [PUPPET_FORGE];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created_at` field from the response.";
	async getReleases({ packageName, registryUrl }) {
		const url = `${registryUrl}/v3/modules/${packageName.replace("/", "-")}?exclude_fields=current_release`;
		let result;
		try {
			result = (await this.http.getJson(url, PuppetModule)).body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
		if (!result.releases.length) return null;
		for (const release of result.releases) release.registryUrl = registryUrl;
		return result;
	}
};
//#endregion
export { PuppetForgeDatasource };

//# sourceMappingURL=index.js.map