import { logger } from "../../../logger/index.js";
import { updateArtifacts as updateArtifacts$1 } from "../terraform/lockfile/index.js";
//#region lib/modules/manager/terragrunt/artifacts.ts
async function updateArtifacts(artifact) {
	if (!artifact.config.isLockFileMaintenance) {
		logger.debug(`UpdateType ${artifact.config.updateType} is not supported for terragrunt`);
		return null;
	}
	return await updateArtifacts$1(artifact);
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map