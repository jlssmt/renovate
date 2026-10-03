//#region lib/modules/manager/kustomize/dep-types.ts
const knownDepTypes = [
	{
		depType: "Kustomization",
		description: "Kustomization resource referencing remote bases or images"
	},
	{
		depType: "Component",
		description: "Kustomize Component resource referencing remote bases or images"
	},
	{
		depType: "HelmChart",
		description: "Helm chart embedded in a kustomization file via `helmCharts`"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map