//#region lib/modules/manager/leiningen/dep-types.ts
const knownDepTypes = [
	{
		depType: "dependencies",
		description: "Listed under `:dependencies`"
	},
	{
		depType: "managed-dependencies",
		description: "Listed under `:managed-dependencies`"
	},
	{
		depType: "plugins",
		description: "Listed under `:plugins`"
	},
	{
		depType: "pom-plugins",
		description: "Listed under `:pom-plugins`"
	},
	{
		depType: "parent-project",
		description: "Listed under `:parent-project` (via lein-parent `:coords`)"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map