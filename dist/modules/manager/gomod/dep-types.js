//#region lib/modules/manager/gomod/dep-types.ts
const knownDepTypes = [
	{
		depType: "golang",
		description: "The `go` directive specifying the minimum version of Go that the code is source compatible with"
	},
	{
		depType: "toolchain",
		description: "The `toolchain` directive specifying the Go toolchain version"
	},
	{
		depType: "require",
		description: "A direct module dependency"
	},
	{
		depType: "indirect",
		description: "An indirect (transitive) module dependency"
	},
	{
		depType: "replace",
		description: "A module replacement directive"
	},
	{
		depType: "tool",
		description: `A tool dependency using Go 1.24+'s \`tool\` directive`
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map