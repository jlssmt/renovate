import { logger } from "../../../../../logger/index.js";
import { TerraformProviderExtractor } from "../../base.js";
import { isNullOrUndefined, isPlainObject } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/others/providers.ts
var ProvidersExtractor = class extends TerraformProviderExtractor {
	getCheckList() {
		return ["provider"];
	}
	extract(hclRoot, locks, config) {
		const providerTypes = hclRoot?.provider;
		if (isNullOrUndefined(providerTypes)) return [];
		/* v8 ignore next -- needs test */
		if (!isPlainObject(providerTypes)) {
			logger.debug({ providerTypes }, "Terraform: unexpected `providerTypes` value");
			return [];
		}
		const dependencies = [];
		for (const providerTypeName of Object.keys(providerTypes)) for (const providerTypeElement of providerTypes[providerTypeName]) {
			const dep = this.analyzeTerraformProvider({
				currentValue: providerTypeElement.version,
				managerData: { moduleName: providerTypeName }
			}, locks, "provider", config);
			dependencies.push(dep);
		}
		return dependencies;
	}
};
//#endregion
export { ProvidersExtractor };

//# sourceMappingURL=providers.js.map