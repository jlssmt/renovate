//#region lib/modules/manager/conan/dep-types.ts
const knownDepTypes = [
	{
		depType: "build_requires",
		description: "A build-time dependency declared in `[build_requires]` or `build_requirements()`"
	},
	{
		depType: "python_requires",
		description: "A Python-based Conan recipe dependency declared via `python_requires`"
	},
	{
		depType: "requires",
		description: "A runtime dependency declared in `[requires]` or `requirements()`"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map