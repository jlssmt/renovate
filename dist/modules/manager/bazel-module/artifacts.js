import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { resolveToolConstraint } from "../util.js";
import { updateBazelLockfile } from "./lockfile.js";
//#region lib/modules/manager/bazel-module/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`bazel-module.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (!updatedDeps.length && !isLockFileMaintenance) {
		logger.debug("No updated bazel-module deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "MODULE.bazel.lock");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("No MODULE.bazel.lock found - skipping artifact update");
		return null;
	}
	await writeLocalFile(packageFileName, newPackageFileContent);
	return await updateBazelLockfile(lockFileName, packageFileName, isLockFileMaintenance, await resolveToolConstraint(config, "bazelisk"));
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map