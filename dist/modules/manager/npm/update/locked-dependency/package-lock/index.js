import { logger } from "../../../../../../logger/index.js";
import { api } from "../../../../../versioning/npm/index.js";
import { updateDependency } from "../../dependency/index.js";
import { findFirstParentVersion } from "../common/parent-version.js";
import { findDepConstraints } from "./dep-constraints.js";
import { getLockedDependencies } from "./get-locked.js";
import detectIndent from "detect-indent";
//#region lib/modules/manager/npm/update/locked-dependency/package-lock/index.ts
async function updateLockedDependency(config, isParentUpdate = false) {
	const { depName, currentVersion, newVersion, packageFile, packageFileContent, lockFile, lockFileContent, allowParentUpdates = true, allowHigherOrRemoved = false } = config;
	logger.debug(`npm.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	try {
		let packageJson;
		let packageLockJson;
		const detectedIndent = detectIndent(lockFileContent).indent || "  ";
		let newPackageJsonContent;
		try {
			packageJson = JSON.parse(packageFileContent);
			packageLockJson = JSON.parse(lockFileContent);
		} catch (err) {
			logger.warn({ err }, "Failed to parse files");
			return { status: "update-failed" };
		}
		const { lockfileVersion } = packageLockJson;
		const lockedDeps = getLockedDependencies(packageLockJson, depName, currentVersion);
		if (lockedDeps.some((dep) => dep.bundled)) {
			logger.debug(`Package ${depName}@${currentVersion} is bundled and cannot be updated`);
			return { status: "update-failed" };
		}
		if (!lockedDeps.length) {
			const newLockedDeps = getLockedDependencies(packageLockJson, depName, newVersion);
			let status;
			if (newLockedDeps.length) {
				logger.debug(`${depName}@${currentVersion} not found in ${lockFile} but ${depName}@${newVersion} was - looks like it's already updated`);
				status = "already-updated";
			} else if (lockfileVersion !== 1) {
				logger.debug(`Found lockfileVersion ${packageLockJson.lockfileVersion}`);
				status = "update-failed";
			} else if (allowHigherOrRemoved) {
				const anyVersionLocked = getLockedDependencies(packageLockJson, depName, null);
				if (anyVersionLocked.length) {
					if (anyVersionLocked.every((dep) => api.isGreaterThan(dep.version, newVersion))) {
						logger.debug(`${depName} found in ${lockFile} with higher version - looks like it's already updated`);
						status = "already-updated";
					} else {
						logger.debug({ anyVersionLocked }, `Found alternative versions of qs`);
						status = "update-failed";
					}
				} else {
					logger.debug(`${depName} not found in ${lockFile} - looks like it's already removed`);
					status = "already-updated";
				}
			} else {
				logger.debug(`${depName}@${currentVersion} not found in ${lockFile} - cannot update`);
				status = "update-failed";
			}
			/* v8 ignore next -- too hard to replicate */
			if (isParentUpdate) {
				const files = {};
				files[packageFile] = packageFileContent;
				files[lockFile] = lockFileContent;
				return {
					status,
					files
				};
			}
			return { status };
		}
		logger.debug(`Found matching dependencies with length ${lockedDeps.length}`);
		const constraints = findDepConstraints(packageJson, packageLockJson, depName, currentVersion, newVersion);
		logger.trace({
			deps: lockedDeps,
			constraints
		}, "Matching details");
		if (!constraints.length) {
			logger.info({
				depName,
				currentVersion,
				newVersion
			}, "Could not find constraints for the locked dependency - cannot remediate");
			return { status: "update-failed" };
		}
		const parentUpdates = [];
		for (const { parentDepName, parentVersion, constraint, depType } of constraints)
 // v8 ignore else -- TODO: add test #40625
		if (api.matches(newVersion, constraint)) logger.debug(`${depName} can be updated to ${newVersion} in-range with matching constraint "${constraint}" in ${
		// v8 ignore start -- hard to test
		parentDepName ? `${parentDepName}@${parentVersion}` : packageFile}`);
		else if (parentDepName && parentVersion) {
			if (!allowParentUpdates) {
				logger.debug(`Cannot update ${depName} to ${newVersion} without an update to ${parentDepName}`);
				return { status: "update-failed" };
			}
			const parentNewVersion = await findFirstParentVersion(parentDepName, parentVersion, depName, newVersion);
			if (parentNewVersion) {
				if (parentNewVersion === parentVersion) logger.debug(`Update of ${depName} to ${newVersion} already achieved in parent ${parentDepName}@${parentNewVersion}`);
				else {
					logger.debug(`Update of ${depName} to ${newVersion} can be achieved due to parent ${parentDepName}`);
					const parentUpdate = {
						depName: parentDepName,
						currentVersion: parentVersion,
						newVersion: parentNewVersion
					};
					parentUpdates.push(parentUpdate);
				}
			} else {
				logger.debug(`Update of ${depName} to ${newVersion} cannot be achieved due to parent ${parentDepName}`);
				return { status: "update-failed" };
			}
		} else if (depType) {
			const newValue = api.getNewValue({
				currentValue: constraint,
				rangeStrategy: "replace",
				currentVersion,
				newVersion
			});
			newPackageJsonContent = updateDependency({
				fileContent: packageFileContent,
				packageFile,
				upgrade: {
					depName,
					depType,
					newValue
				}
			});
		}
		for (const dependency of lockedDeps) {
			dependency.version = newVersion;
			delete dependency.resolved;
			delete dependency.integrity;
		}
		let newLockFileContent = JSON.stringify(packageLockJson, null, detectedIndent);
		for (const parentUpdate of parentUpdates) {
			const parentUpdateResult = await updateLockedDependency({
				...config,
				...parentUpdate,
				lockFileContent: newLockFileContent,
				packageFileContent: newPackageJsonContent ?? packageFileContent
			}, true);
			/* v8 ignore next -- hard to test due to recursion */
			if (!parentUpdateResult.files) {
				logger.debug(`Update of ${depName} to ${newVersion} impossible due to failed update of parent ${parentUpdate.depName} to ${parentUpdate.newVersion}`);
				return { status: "update-failed" };
			}
			newPackageJsonContent = parentUpdateResult.files[packageFile] || newPackageJsonContent;
			/* v8 ignore next -- hard to test */
			newLockFileContent = parentUpdateResult.files[lockFile] || newLockFileContent;
		}
		const files = {};
		// v8 ignore else -- TODO: add test #40625
		if (newLockFileContent) files[lockFile] = newLockFileContent;
		if (newPackageJsonContent) files[packageFile] = newPackageJsonContent;
		else if (lockfileVersion !== 1) {
			logger.debug("Remediations which change package-lock.json only are not supported unless lockfileVersion=1");
			return { status: "unsupported" };
		}
		return {
			status: "updated",
			files
		};
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.error({ err }, "updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=index.js.map