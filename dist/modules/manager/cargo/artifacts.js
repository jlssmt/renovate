import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { findLocalSiblingOrParent, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { artifactErrorResult, fileAddition, resolveToolConstraint } from "../util.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
import { extractLockFileContentVersions } from "./locked-version.js";
import { quote } from "shlex";
//#region lib/modules/manager/cargo/artifacts.ts
const gitExec = withGitEnvironment(["cargo"]);
async function cargoUpdate(manifestPath, isLockFileMaintenance, constraint) {
	let cmd = `cargo update --config net.git-fetch-with-cli=true --manifest-path ${quote(manifestPath)}`;
	if (!isLockFileMaintenance) cmd += ` --workspace`;
	await gitExec(cmd, {
		docker: {},
		toolConstraints: [{
			toolName: "rust",
			constraint
		}]
	});
}
async function cargoUpdatePrecise(manifestPath, updatedDeps, constraint) {
	const cmds = [];
	for (const dep of updatedDeps) {
		if (dep.currentValue && dep.newValue && dep.currentValue !== dep.newValue) continue;
		cmds.push(`cargo update --config net.git-fetch-with-cli=true --manifest-path ${quote(manifestPath)} --package ${quote(`${dep.packageName}@${dep.lockedVersion}`)} --precise ${quote(dep.newVersion)}`);
	}
	cmds.push(`cargo update --config net.git-fetch-with-cli=true --manifest-path ${quote(manifestPath)} --workspace`);
	await gitExec(cmds, {
		docker: {},
		toolConstraints: [{
			toolName: "rust",
			constraint
		}]
	});
}
async function updateArtifacts(updateArtifact) {
	return await updateArtifactsImpl(updateArtifact);
}
async function updateArtifactsImpl({ packageFileName, updatedDeps, newPackageFileContent, config }, recursionLimit = 10) {
	logger.debug(`cargo.updateArtifacts(${packageFileName})`);
	const lockFileName = await findLocalSiblingOrParent(packageFileName, "Cargo.lock");
	const existingLockFileContent = lockFileName ? await readLocalFile(lockFileName) : null;
	if (!existingLockFileContent || !lockFileName) {
		logger.debug("No Cargo.lock found");
		return null;
	}
	const { isLockFileMaintenance } = config;
	if (!isLockFileMaintenance && !updatedDeps?.length) {
		logger.debug("No more dependencies to update");
		return [fileAddition(lockFileName, existingLockFileContent)];
	}
	const rustConstraint = await resolveToolConstraint(config, "rust");
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		logger.debug(`Updating ${lockFileName}`);
		if (isLockFileMaintenance) await cargoUpdate(packageFileName, true, rustConstraint);
		else {
			const hasNonCrateDep = updatedDeps.some((dep) => dep.datasource !== CrateDatasource.id);
			const crateDepWithoutLockedVersion = updatedDeps.find((dep) => !dep.lockedVersion && dep.datasource === CrateDatasource.id);
			if (hasNonCrateDep || crateDepWithoutLockedVersion) {
				// v8 ignore else -- needs a workspace update driven only by a non-crate dep
				if (crateDepWithoutLockedVersion) logger.warn({ dependency: crateDepWithoutLockedVersion.depName }, "Missing locked version for dependency");
				await cargoUpdate(packageFileName, false, rustConstraint);
			} else await cargoUpdatePrecise(packageFileName, updatedDeps, rustConstraint);
		}
		logger.debug("Returning updated Cargo.lock");
		const newCargoLockContent = await readLocalFile(lockFileName);
		if (existingLockFileContent === newCargoLockContent) {
			logger.debug("Cargo.lock is unchanged");
			return null;
		}
		return [fileAddition(lockFileName, newCargoLockContent)];
	} catch (err) {
		// istanbul ignore if
		if (err.message === "temporary-error") throw err;
		const newCargoLockContent = await readLocalFile(lockFileName, "utf8");
		if (recursionLimit > 0 && newCargoLockContent && regEx(/error: package ID specification/).test(err.stderr)) {
			const versions = extractLockFileContentVersions(newCargoLockContent);
			const newUpdatedDeps = updatedDeps.filter((dep) => !coerceArray(versions?.get(dep.packageName)).includes(dep.newVersion));
			// v8 ignore else -- this retry only runs when a dep was already current
			if (newUpdatedDeps.length < updatedDeps.length) {
				logger.debug("Dependency already up to date - reattempting recursively");
				return updateArtifactsImpl({
					packageFileName,
					updatedDeps: newUpdatedDeps,
					newPackageFileContent,
					config
				}, recursionLimit - 1);
			}
		}
		logger.debug({ err }, "Failed to update Cargo lock file");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map