import "../../../constants/error-messages.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactErrorResult, updateLockFile } from "../util.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/modules/manager/pixi/lockfile.ts
const commandLock = "pixi lock --no-progress --color=never --quiet";
/**
* Regenerate the sibling `pixi.lock` of a package file by running `pixi lock`.
*
* Shared by the standalone `pixi` manager and the `pep621` pixi processor.
*/
async function updatePixiLockfile({ packageFileName, updatedDeps, isLockFileMaintenance, constraint, newPackageFileContent }) {
	if (!isNonEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated pixi deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "pixi.lock");
	const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		logger.debug("No pixi.lock found");
		return null;
	}
	if (!GlobalConfig.get("allowedUnsafeExecutions").includes("pixi")) {
		logger.once.warn("`pixi lock` was requested to run, but `pixi` is not permitted in the allowedUnsafeExecutions");
		return null;
	}
	try {
		return await updateLockFile({
			lockFileName,
			existingLockFileContent,
			packageFile: newPackageFileContent === void 0 ? void 0 : {
				path: packageFileName,
				contents: newPackageFileContent
			},
			deleteLockFile: isLockFileMaintenance,
			run: async () => {
				const PIXI_CACHE_DIR = await ensureCacheDir("pixi");
				await exec([commandLock], {
					cwdFile: packageFileName,
					extraEnv: {
						PIXI_CACHE_DIR,
						RATTLER_CACHE_DIR: PIXI_CACHE_DIR
					},
					docker: {},
					toolConstraints: [{
						toolName: "pixi",
						constraint
					}]
				});
			}
		});
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, `Failed to update ${lockFileName} file`);
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { commandLock, updatePixiLockfile };

//# sourceMappingURL=lockfile.js.map