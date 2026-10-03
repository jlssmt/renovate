import { id } from "../../../../versioning/hashicorp/index.js";
import { GithubReleasesDatasource } from "../../../../datasource/github-releases/index.js";
import { DependencyExtractor } from "../../base.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/terraform-block/terraform-version.ts
var TerraformVersionExtractor = class extends DependencyExtractor {
	getCheckList() {
		return ["required_version"];
	}
	extract(hclRoot) {
		const terraformBlocks = hclRoot?.terraform;
		if (isNullOrUndefined(terraformBlocks)) return [];
		const dependencies = [];
		for (const terraformBlock of terraformBlocks) {
			const requiredVersion = terraformBlock.required_version;
			if (isNullOrUndefined(requiredVersion)) continue;
			dependencies.push(this.analyseTerraformVersion({ currentValue: requiredVersion }));
		}
		return dependencies;
	}
	analyseTerraformVersion(dep) {
		dep.depType = "required_version";
		dep.datasource = GithubReleasesDatasource.id;
		dep.depName = "hashicorp/terraform";
		dep.extractVersion = "v(?<version>.*)$";
		dep.versioning = id;
		return dep;
	}
};
//#endregion
export { TerraformVersionExtractor };

//# sourceMappingURL=terraform-version.js.map