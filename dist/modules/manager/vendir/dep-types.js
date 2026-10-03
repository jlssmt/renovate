//#region lib/modules/manager/vendir/dep-types.ts
const knownDepTypes = [
	{
		depType: "HelmChart",
		description: "Helm chart dependency in vendir configuration"
	},
	{
		depType: "GitSource",
		description: "Git reference-based source"
	},
	{
		depType: "GithubRelease",
		description: "GitHub release-based source"
	},
	{
		depType: "HttpSource",
		description: "HTTP-based source"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map