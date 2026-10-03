import { ensureTrailingSlash } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { ServiceDiscoveryResponse } from "./schema.js";
//#region lib/modules/datasource/terraform-module/base.ts
const terraformId = "terraform";
var TerraformDatasource = class TerraformDatasource extends Datasource {
	static id = terraformId;
	static terraformRegistryUrl = "https://registry.terraform.io";
	static openTofuApiUrl = "https://api.opentofu.org";
	static openTofuRegistryUrl = "https://registry.opentofu.org";
	async _getTerraformServiceDiscoveryResult(registryUrl) {
		const discoveryURL = TerraformDatasource.getDiscoveryUrl(registryUrl);
		const { body: res } = await this.http.getJson(discoveryURL, ServiceDiscoveryResponse);
		return res;
	}
	getTerraformServiceDiscoveryResult(registryUrl) {
		return withCache({
			namespace: `datasource-${terraformId}`,
			key: TerraformDatasource.getDiscoveryUrl(registryUrl),
			ttlMinutes: 1440
		}, () => this._getTerraformServiceDiscoveryResult(registryUrl));
	}
	static getDiscoveryUrl(registryUrl) {
		return `${ensureTrailingSlash(registryUrl)}.well-known/terraform.json`;
	}
	handleHttpErrors(err) {
		if (["EAI_AGAIN"].includes(err.code)) throw new ExternalHostError(err);
		if (err.response?.statusCode === 503) throw new ExternalHostError(err);
	}
};
//#endregion
export { TerraformDatasource };

//# sourceMappingURL=base.js.map