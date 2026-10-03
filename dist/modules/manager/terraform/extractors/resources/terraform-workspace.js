import { TerraformVersionExtractor } from "../terraform-block/terraform-version.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/resources/terraform-workspace.ts
var TerraformWorkspaceExtractor = class extends TerraformVersionExtractor {
	getCheckList() {
		return [`"tfe_workspace"`];
	}
	extract(hclMap) {
		const dependencies = [];
		const workspaces = hclMap?.resource?.tfe_workspace;
		if (isNullOrUndefined(workspaces)) return [];
		for (const workspace of Object.values(workspaces).flat()) {
			const dep = this.analyseTerraformVersion({ currentValue: workspace.terraform_version });
			if (isNullOrUndefined(workspace.terraform_version)) dep.skipReason = "unspecified-version";
			dependencies.push({
				...dep,
				depType: "tfe_workspace"
			});
		}
		return dependencies;
	}
};
//#endregion
export { TerraformWorkspaceExtractor };

//# sourceMappingURL=terraform-workspace.js.map