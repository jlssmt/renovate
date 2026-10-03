import { logger } from "../../../../../../logger/index.js";
import { api } from "../../../../../versioning/npm/index.js";
import { getLockedDependencies } from "./get-locked.js";
import { replaceConstraintVersion } from "./replace.js";
import { parseSyml } from "@yarnpkg/parsers";
//#region lib/modules/manager/npm/update/locked-dependency/yarn-lock/index.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`npm.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	let yarnLock;
	try {
		yarnLock = parseSyml(lockFileContent);
	} catch (err) {
		logger.warn({ err }, "Failed to parse yarn files");
		return { status: "update-failed" };
	}
	try {
		const lockedDeps = getLockedDependencies(yarnLock, depName, currentVersion);
		if (!lockedDeps.length) {
			if (getLockedDependencies(yarnLock, depName, newVersion).length) {
				logger.debug(`${depName}@${currentVersion} not found in ${lockFile} but ${depName}@${newVersion} was - looks like it's already updated`);
				return { status: "already-updated" };
			}
			logger.debug(`${depName}@${currentVersion} not found in ${lockFile} - cannot update`);
			return { status: "update-failed" };
		}
		if ("__metadata" in yarnLock) {
			logger.debug("Cannot patch Yarn 2+ lock file directly - falling back to using yarn");
			return { status: "unsupported" };
		}
		logger.debug(`Found matching dependencies with length ${lockedDeps.length}`);
		const updateLockedDeps = [];
		for (const lockedDep of lockedDeps) {
			if (api.matches(newVersion, lockedDep.constraint)) {
				logger.debug(`Dependency ${depName} can be updated from ${newVersion} to ${newVersion} in range ${lockedDep.constraint}`);
				updateLockedDeps.push({
					...lockedDep,
					newVersion
				});
				continue;
			}
			logger.debug(`Dependency ${depName} cannot be updated from ${newVersion} to ${newVersion} in range ${lockedDep.constraint}`);
			return { status: "update-failed" };
		}
		let newLockFileContent = lockFileContent;
		for (const dependency of updateLockedDeps) {
			const { depName, constraint, newVersion } = dependency;
			newLockFileContent = replaceConstraintVersion(newLockFileContent, depName, constraint, newVersion);
		}
		/* v8 ignore next -- cannot test */
		if (newLockFileContent === lockFileContent) {
			logger.debug("Failed to make any changes to lock file");
			return { status: "update-failed" };
		}
		return {
			status: "updated",
			files: { [lockFile]: newLockFileContent }
		};
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.error({ err }, "updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=index.js.map