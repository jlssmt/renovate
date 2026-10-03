import { BasePyProjectProcessor } from "./abstract.js";
//#region lib/modules/manager/pep621/processors/hatch.ts
var HatchProcessor = class extends BasePyProjectProcessor {
	process(pyproject, deps) {
		const hatchDeps = pyproject.tool?.hatch?.deps;
		if (hatchDeps) deps.push(...hatchDeps);
		return deps;
	}
	extractLockedVersions(_project, deps, _packageFile) {
		return Promise.resolve(deps);
	}
	updateArtifacts(_updateArtifact, _project) {
		return Promise.resolve(null);
	}
};
//#endregion
export { HatchProcessor };

//# sourceMappingURL=hatch.js.map