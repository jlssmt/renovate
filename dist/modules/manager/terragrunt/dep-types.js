//#region lib/modules/manager/terragrunt/dep-types.ts
const knownDepTypes = [
	{
		depType: "github",
		description: "Terragrunt module sourced from a GitHub repository"
	},
	{
		depType: "gitTags",
		description: "Terragrunt module sourced from a generic Git repository"
	},
	{
		depType: "terragrunt",
		description: "Terragrunt module sourced from a Terraform Module registry"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map