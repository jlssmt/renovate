import { logger } from "../../../logger/index.js";
import { Result } from "../../../util/result.js";
import { Lockfile } from "./schema.js";
//#region lib/modules/manager/poetry/update-locked.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`poetry.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	const LockedVersion = Lockfile.transform(({ lock }) => lock[depName]);
	return Result.parse(lockFileContent, LockedVersion).transform((lockedVersion) => lockedVersion === newVersion ? { status: "already-updated" } : { status: "unsupported" }).unwrapOr({ status: "unsupported" });
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map