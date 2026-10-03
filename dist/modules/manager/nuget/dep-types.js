//#region lib/modules/manager/nuget/dep-types.ts
const knownDepTypes = [
	{
		depType: "docker",
		description: "Container base image from `ContainerBaseImage`"
	},
	{
		depType: "nuget",
		description: "NuGet package reference from `PackageReference`, `PackageVersion`, or similar elements"
	},
	{
		depType: "msbuild-sdk",
		description: "MSBuild SDK reference from `Sdk` elements, `Import` elements, or `Project Sdk` attribute"
	},
	{
		depType: "dotnet-sdk",
		description: ".NET SDK version from `global.json`"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map