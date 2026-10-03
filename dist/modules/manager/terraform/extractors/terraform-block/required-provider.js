import { TerraformProviderExtractor } from "../../base.js";
import { isNullOrUndefined, isString } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/terraform-block/required-provider.ts
var RequiredProviderExtractor = class extends TerraformProviderExtractor {
	getCheckList() {
		return ["required_providers"];
	}
	extract(hclRoot, locks, config) {
		const terraformBlocks = hclRoot?.terraform;
		if (isNullOrUndefined(terraformBlocks)) return [];
		const dependencies = [];
		for (const terraformBlock of terraformBlocks) {
			const requiredProviders = terraformBlock.required_providers;
			if (isNullOrUndefined(requiredProviders)) continue;
			const entries = requiredProviders.flatMap(Object.entries);
			for (const [requiredProviderName, value] of entries) {
				let dep;
				if (isString(value)) dep = {
					currentValue: value,
					managerData: { moduleName: requiredProviderName }
				};
				else dep = {
					currentValue: value.version,
					managerData: {
						moduleName: requiredProviderName,
						source: value.source
					}
				};
				dependencies.push(this.analyzeTerraformProvider(dep, locks, "required_provider", config));
			}
		}
		return dependencies;
	}
};
//#endregion
export { RequiredProviderExtractor };

//# sourceMappingURL=required-provider.js.map