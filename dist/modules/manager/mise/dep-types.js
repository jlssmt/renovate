//#region lib/modules/manager/mise/dep-types.ts
const knownDepTypes = [{
	depType: "tools",
	description: "A tool defined under the top-level `[tools]` table"
}];
const supportsDynamicDepTypesNote = "Tools defined under `tasks.<name>.tools` produce dynamic `depType` values in the form `task-<name>-tools`, where `<name>` is the task name (e.g. `task-lint-tools`).";
//#endregion
export { knownDepTypes, supportsDynamicDepTypesNote };

//# sourceMappingURL=dep-types.js.map