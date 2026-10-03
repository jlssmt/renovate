import { logger } from "../../../logger/index.js";
import { resolveToolConstraint } from "../util.js";
import { updatePixiLockfile } from "./lockfile.js";
import { getUserPixiConfig } from "./extract.js";
//#region lib/modules/manager/pixi/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`pixi.updateArtifacts(${packageFileName})`);
	const pixiConfig = getUserPixiConfig(newPackageFileContent, packageFileName);
	const constraint = await resolveToolConstraint(config, "pixi", () => pixiConfig?.project["requires-pixi"]);
	return await updatePixiLockfile({
		packageFileName,
		updatedDeps,
		isLockFileMaintenance: config.isLockFileMaintenance,
		constraint,
		newPackageFileContent
	});
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map