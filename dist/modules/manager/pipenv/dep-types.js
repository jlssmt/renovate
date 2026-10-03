//#region lib/modules/manager/pipenv/dep-types.ts
const knownDepTypes = [{
	depType: "packages",
	description: "Listed under `[packages]`"
}, {
	depType: "dev-packages",
	description: "Listed under `[dev-packages]`"
}];
const supportsDynamicDepTypesNote = "Dependencies from other package category groups in the Pipfile use the group name as the `depType`.";
//#endregion
export { knownDepTypes, supportsDynamicDepTypesNote };

//# sourceMappingURL=dep-types.js.map