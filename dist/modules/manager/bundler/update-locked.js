import { logger } from "../../../logger/index.js";
import { extractLockFileEntries } from "./locked-version.js";
//#region lib/modules/manager/bundler/update-locked.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`bundler.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	try {
		if (extractLockFileEntries(lockFileContent ?? "").get(depName ?? "") === newVersion) return { status: "already-updated" };
		return { status: "unsupported" };
	} catch (err) {
		logger.debug({ err }, "bundler.updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map