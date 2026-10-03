import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { platform } from "../../../../modules/platform/index.js";
//#region lib/workers/repository/update/branch/artifacts.ts
async function setArtifactErrorStatus(config) {
	const mode = config.statusCheckWhen?.artifactError ?? "failed";
	const hasErrors = !!config.artifactErrors?.length;
	if (mode === "never") {
		if (hasErrors) logger.debug("statusCheckWhen.artifactError is set to \"never\", skipping artifacts status check.");
		return;
	}
	if (mode === "failed" && !hasErrors) return;
	const context = config.statusCheckNames?.artifactError;
	if (!context) {
		logger.debug("Status check is null or an empty string, skipping status check addition.");
		return;
	}
	const state = hasErrors ? "red" : "green";
	const description = hasErrors ? "Artifact file update failure" : "Artifact file update success";
	if (await platform.getBranchStatusCheck(config.branchName, context) !== state) {
		logger.debug(`Updating status check state to ${state}`);
		if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would set branch status in ${config.branchName}`);
		else await platform.setBranchStatus({
			branchName: config.branchName,
			context,
			description,
			state
		});
	}
}
//#endregion
export { setArtifactErrorStatus };

//# sourceMappingURL=artifacts.js.map