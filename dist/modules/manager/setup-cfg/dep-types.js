//#region lib/modules/manager/setup-cfg/dep-types.ts
const knownDepTypes = [
	{
		depType: "install",
		description: "Listed under `install_requires` in the `[options]` section"
	},
	{
		depType: "setup",
		description: "Listed under `setup_requires` in the `[options]` section"
	},
	{
		depType: "test",
		description: "Listed under `tests_require` in the `[options]` section"
	},
	{
		depType: "extra",
		description: "Listed under the `[options.extras_require]` section"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map