//#region lib/modules/manager/azure-pipelines/dep-types.ts
const knownDepTypes = [{
	depType: "docker",
	description: "A Docker image reference in a `container:` field in Azure Pipelines"
}, {
	depType: "gitTags",
	description: "A Git repository resource referenced by tag (e.g. `refs/tags/v1.0.0`)"
}];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map