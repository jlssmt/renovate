import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { deleteLocalFile, getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/modules/manager/apm/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`apm.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (!isNonEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("apm: no updated deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "apm.lock.yaml");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("apm: no lock file found");
		return null;
	}
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		if (isLockFileMaintenance) await deleteLocalFile(lockFileName);
		const execOptions = {
			cwdFile: packageFileName,
			docker: {},
			toolConstraints: [{
				toolName: "apm",
				constraint: await resolveToolConstraint(config, "apm")
			}]
		};
		await exec("apm install", execOptions);
		const status = await getRepoStatus();
		const res = fileChangesToArtifactResults([...await collectFileChanges(status, {
			include: ["modified", "not_added"],
			filter: (path) => path !== packageFileName
		}), ...await collectFileChanges(status, { include: ["deleted"] })]);
		if (!res.length) {
			logger.debug("apm: no changed files after install");
			return null;
		}
		return res;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, `Failed to update ${lockFileName}`);
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map