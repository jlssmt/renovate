import { coerceString } from "../../../../util/string.js";
import { logger } from "../../../../logger/index.js";
import { extractLocks } from "./util.js";
//#region lib/modules/manager/terraform/lockfile/update-locked.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`terraform.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	try {
		if ((extractLocks(coerceString(lockFileContent))?.find((dep) => dep.packageName === coerceString(depName)))?.version === newVersion) return { status: "already-updated" };
		return { status: "unsupported" };
	} catch (err) {
		logger.debug({ err }, "terraform.updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map