//#region lib/modules/manager/poetry/dep-types.ts
const knownDepTypes = [
	{
		depType: "dependencies",
		description: "Listed under `[tool.poetry.dependencies]`"
	},
	{
		depType: "dev-dependencies",
		description: "Listed under `[tool.poetry.dev-dependencies]`"
	},
	{
		depType: "extras",
		description: "An optional dependency marked with `optional = true`"
	},
	{
		depType: "build-system.requires",
		description: "Listed under `[build-system.requires]`"
	},
	{
		depType: "project.dependencies",
		description: "Listed under `[project.dependencies]` (PEP 621 style)"
	},
	{
		depType: "project.optional-dependencies",
		description: "Listed under `[project.optional-dependencies]` (PEP 621 style)"
	},
	{
		depType: "dependency-groups",
		description: "Listed under `[dependency-groups]` (PEP 735)"
	}
];
const supportsDynamicDepTypesNote = "Dependency group names from `[tool.poetry.group.<name>.dependencies]` are also used as `depType` values.";
//#endregion
export { knownDepTypes, supportsDynamicDepTypesNote };

//# sourceMappingURL=dep-types.js.map