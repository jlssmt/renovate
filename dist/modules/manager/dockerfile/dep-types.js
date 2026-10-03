//#region lib/modules/manager/dockerfile/dep-types.ts
const knownDepTypes = [
	{
		depType: "syntax",
		description: "The `# syntax=` parser directive at the top of the Dockerfile"
	},
	{
		depType: "stage",
		description: "An intermediate `FROM` instruction in a multi-stage build"
	},
	{
		depType: "final",
		description: "The last `FROM` instruction in the Dockerfile (the final build stage)"
	},
	{
		depType: "install",
		description: "A system package manager was used to install a package, for instance via `RUN apk add ...`"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map