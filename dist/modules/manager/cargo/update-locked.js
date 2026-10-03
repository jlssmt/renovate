import { logger } from "../../../logger/index.js";
import { extractLockFileContentVersions } from "./locked-version.js";
//#region lib/modules/manager/cargo/update-locked.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`cargo.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	try {
		if (extractLockFileContentVersions(lockFileContent)?.get(depName)?.find((version) => version === newVersion)) return { status: "already-updated" };
		return { status: "unsupported" };
	} catch (err) {
		logger.debug({ err }, "cargo.updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map