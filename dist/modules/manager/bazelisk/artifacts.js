import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { resolveToolConstraint } from "../util.js";
import { updateBazelLockfile } from "../bazel-module/lockfile.js";
//#region lib/modules/manager/bazelisk/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`bazelisk.updateArtifacts(${packageFileName})`);
	if (!updatedDeps.length && !config.isLockFileMaintenance) {
		logger.debug("No updated bazelisk deps - returning null");
		return null;
	}
	const moduleFileName = getSiblingFileName(packageFileName, "MODULE.bazel");
	if (!await readLocalFile(moduleFileName, "utf8")) {
		logger.debug("No MODULE.bazel found - skipping artifact update");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "MODULE.bazel.lock");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("No MODULE.bazel.lock found - skipping artifact update");
		return null;
	}
	await writeLocalFile(packageFileName, newPackageFileContent);
	return await updateBazelLockfile(lockFileName, moduleFileName, config.isLockFileMaintenance, await resolveToolConstraint(config, "bazelisk"));
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map