import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { isEmptyArray, isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/gleam/artifacts.ts
async function updateArtifacts(updateArtifact) {
	const { packageFileName, updatedDeps, newPackageFileContent, config } = updateArtifact;
	logger.debug(`gleam.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (isEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated gleam deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "manifest.toml");
	const oldLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!oldLockFileContent) {
		logger.debug(`No ${lockFileName} found`);
		return null;
	}
	try {
		const execOptions = {
			cwdFile: packageFileName,
			docker: {},
			toolConstraints: [{
				toolName: "gleam",
				constraint: await resolveToolConstraint(config, "gleam")
			}]
		};
		const updateCommand = ["gleam deps update", ...(isLockFileMaintenance ? [] : updatedDeps.map((dep) => dep.depName).filter(isString)).map(quote)].join(" ");
		return await updateLockFile({
			lockFileName,
			existingLockFileContent: oldLockFileContent,
			packageFile: {
				path: packageFileName,
				contents: newPackageFileContent
			},
			deleteLockFile: isLockFileMaintenance,
			run: () => exec(updateCommand, execOptions)
		});
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.warn({
			lockfile: lockFileName,
			err
		}, `Failed to update lock file`);
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map