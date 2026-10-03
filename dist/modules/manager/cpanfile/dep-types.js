//#region lib/modules/manager/cpanfile/dep-types.ts
const knownDepTypes = [
	{
		depType: "configure",
		description: "Dependencies needed during the configure phase"
	},
	{
		depType: "build",
		description: "Dependencies needed during the build phase"
	},
	{
		depType: "test",
		description: "Dependencies needed during the test phase"
	},
	{
		depType: "runtime",
		description: "Dependencies needed at runtime"
	},
	{
		depType: "develop",
		description: "Dependencies needed during development (author_requires)"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map