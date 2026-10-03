import { logger } from "../../../../logger/index.js";
import { getSiblingFileName, localPathExists } from "../../../../util/fs/index.js";
import { resolveToolConstraint } from "../../util.js";
import { BasePyProjectProcessor } from "./abstract.js";
import { updatePixiLockfile } from "../../pixi/lockfile.js";
//#region lib/modules/manager/pep621/processors/pixi.ts
var PixiProcessor = class extends BasePyProjectProcessor {
	process(_project, deps) {
		return deps;
	}
	extractLockedVersions(_project, deps, _packageFile) {
		return Promise.resolve(deps);
	}
	async getLockfiles(_project, packageFile) {
		const lockfileName = getSiblingFileName(packageFile, "pixi.lock");
		if (await localPathExists(lockfileName)) return [lockfileName];
		logger.debug({ packageFile }, "No pixi.lock found");
		return [];
	}
	async updateArtifacts({ config, updatedDeps, packageFileName }, project) {
		const constraint = await resolveToolConstraint(config, "pixi", () => project.tool?.pixi?.["requires-pixi"]);
		return await updatePixiLockfile({
			packageFileName,
			updatedDeps,
			isLockFileMaintenance: config.isLockFileMaintenance,
			constraint
		});
	}
};
//#endregion
export { PixiProcessor };

//# sourceMappingURL=pixi.js.map