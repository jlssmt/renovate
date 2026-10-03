//#region lib/modules/manager/pre-commit/dep-types.ts
const knownDepTypes = [
	{
		depType: "repository",
		description: "Pre-commit hook repository reference"
	},
	{
		depType: "pre-commit-node",
		description: "Node.js additional dependency for a pre-commit hook"
	},
	{
		depType: "pre-commit-python",
		description: "Python additional dependency for a pre-commit hook"
	},
	{
		depType: "pre-commit-golang",
		description: "Go additional dependency for a pre-commit hook"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map