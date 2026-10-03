//#region lib/modules/manager/sbt/dep-types.ts
const knownDepTypes = [{
	depType: "plugin",
	description: "An sbt plugin added via `addSbtPlugin` or `addCompilerPlugin`"
}];
const supportsDynamicDepTypesNote = "Other `depType` values are extracted dynamically from the classifier or configuration string in the build file (e.g. `% \"test\"`, `% Provided`, `classifier \"sources\"`).";
//#endregion
export { knownDepTypes, supportsDynamicDepTypesNote };

//# sourceMappingURL=dep-types.js.map