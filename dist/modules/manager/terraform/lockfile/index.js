import { coerceObject } from "../../../../util/object.js";
import { regEx } from "../../../../util/regex.js";
import { coerceArray } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { get } from "../../../versioning/index.js";
import { map } from "../../../../util/promises.js";
import { getDefaultVersioning } from "../../../datasource/common.js";
import { getPkgReleases } from "../../../datasource/index.js";
import { extractLocks, findLockFile, isPinnedVersion, massageNewValue, readLockFile, sortConstraints, writeLockUpdates } from "./util.js";
import { massageProviderLookupName } from "../util.js";
import { TerraformProviderHash } from "./hash.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/lockfile/index.ts
async function updateAllLocks(locks) {
	return (await map(locks, async (lock) => {
		const updateConfig = {
			datasource: "terraform-provider",
			packageName: lock.packageName,
			registryUrls: [lock.registryUrl]
		};
		const { releases } = coerceObject(await getPkgReleases(updateConfig));
		if (!releases) return null;
		const versioning = get(getDefaultVersioning("terraform-provider"));
		const versionsList = releases.map((release) => release.version);
		const newVersion = versioning.getSatisfyingVersion(versionsList, lock.constraints);
		if (!newVersion || newVersion === lock.version) return null;
		return {
			newVersion,
			newConstraint: lock.constraints,
			newHashes: coerceArray(await TerraformProviderHash.createHashes(lock.registryUrl, lock.packageName, newVersion)),
			...lock
		};
	}, { concurrency: 4 })).filter(isTruthy);
}
function getNewConstraint(dep, oldConstraint) {
	const { currentValue, currentVersion, newValue: rawNewValue, newVersion, packageName } = dep;
	const newValue = massageNewValue(rawNewValue);
	if (oldConstraint && currentValue && newValue && currentValue === newValue) {
		logger.debug(`Leaving constraints "${oldConstraint}" unchanged for "${packageName}" as current and new values are the same`);
		return oldConstraint;
	}
	if (oldConstraint && currentValue && newValue && oldConstraint.includes(currentValue)) {
		logger.debug(`Updating constraint "${oldConstraint}" to replace "${currentValue}" with "${newValue}" for "${packageName}"`);
		return sortConstraints(oldConstraint.replace(regEx(`(,\\s|^)${RegExp.escape(currentValue)}(\\.0)*`), `$1${newValue}`));
	}
	if (oldConstraint && currentVersion && newVersion && oldConstraint.includes(currentVersion)) {
		logger.debug(`Updating constraint "${oldConstraint}" to replace "${currentVersion}" with "${newVersion}" for "${packageName}"`);
		return sortConstraints(oldConstraint.replace(currentVersion, newVersion));
	}
	if (isPinnedVersion(newValue)) {
		logger.debug(`Pinning constraint for "${packageName}" to "${newVersion}"`);
		return newVersion;
	}
	logger.debug(`Could not detect constraint to update for "${packageName}" so setting to newValue "${newValue}"`);
	return newValue;
}
async function updateArtifacts({ packageFileName, updatedDeps, config }) {
	logger.debug(`terraform.updateArtifacts(${packageFileName})`);
	const lockFilePath = await findLockFile(packageFileName);
	if (!lockFilePath) {
		logger.debug("No .terraform.lock.hcl found");
		return null;
	}
	try {
		const lockFileContent = await readLockFile(lockFilePath);
		if (!lockFileContent) {
			logger.debug("No .terraform.lock.hcl found");
			return null;
		}
		const locks = extractLocks(lockFileContent);
		if (!locks) {
			logger.debug("No Locks in .terraform.lock.hcl found");
			return null;
		}
		const updates = [];
		if (config.isLockFileMaintenance) {
			const maintenanceUpdates = await updateAllLocks(locks);
			updates.push(...maintenanceUpdates);
		} else {
			const providerDeps = updatedDeps.filter((dep) => ["provider", "required_provider"].includes(dep.depType));
			logger.debug(`Found ${providerDeps.length} provider deps`);
			for (const dep of providerDeps) {
				massageProviderLookupName(dep);
				const { registryUrls, newVersion, packageName } = dep;
				const updateLock = locks.find((value) => value.packageName === packageName);
				/* v8 ignore next -- needs test */
				if (!updateLock) {
					logger.debug(`Skipping. No lock found for "${packageName}"`);
					continue;
				}
				if (dep.isLockfileUpdate) {
					// v8 ignore else -- needs a lockfile update that also produces a change
					if (!get(dep.versioning).getSatisfyingVersion([dep.newVersion], updateLock.constraints)) {
						logger.debug(`Skipping. Lockfile update with "${newVersion}" does not statisfy constraints "${updateLock.constraints}" for "${packageName}"`);
						continue;
					}
				}
				const registryUrl = registryUrls?.[0] ?? updateLock.registryUrl;
				const update = {
					newVersion,
					newConstraint: getNewConstraint(dep, updateLock.constraints),
					newHashes: coerceArray(await TerraformProviderHash.createHashes(registryUrl, updateLock.packageName, newVersion)),
					...updateLock
				};
				updates.push(update);
			}
		}
		if (updates.length === 0 || updates.some((value) => !value.newHashes?.length)) {
			logger.debug("No updates found or hash creation failed");
			return null;
		}
		logger.debug(`Writing updates to ${lockFilePath}`);
		return [writeLockUpdates(updates, lockFilePath, lockFileContent)];
	} catch (err) {
		return [{ artifactError: {
			fileName: lockFilePath,
			stderr: err.message
		} }];
	}
}
//#endregion
export { getNewConstraint, updateArtifacts };

//# sourceMappingURL=index.js.map