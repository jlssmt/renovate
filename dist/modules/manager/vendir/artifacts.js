import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileAddition, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
//#region lib/modules/manager/vendir/artifacts.ts
const gitExec = withGitEnvironment();
async function updateArtifacts({ packageFileName, newPackageFileContent, config }) {
	logger.debug(`vendir.updateArtifacts(${packageFileName})`);
	const lockFileName = getSiblingFileName(packageFileName, "vendir.lock.yml");
	if (!lockFileName) {
		logger.warn("No vendir.lock.yml found");
		return null;
	}
	const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		logger.warn("Empty vendir.lock.yml found");
		return null;
	}
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		logger.debug("Updating Vendir artifacts");
		const execOptions = {
			cwdFile: packageFileName,
			docker: {},
			toolConstraints: [{
				toolName: "vendir",
				constraint: await resolveToolConstraint(config, "vendir")
			}, {
				toolName: "helm",
				constraint: await resolveToolConstraint(config, "helm")
			}]
		};
		await gitExec(`vendir sync`, execOptions);
		logger.debug("Returning updated Vendir artifacts");
		const fileChanges = [];
		const newVendirLockContent = await readLocalFile(lockFileName, "utf8");
		if (existingLockFileContent !== newVendirLockContent) fileChanges.push(fileAddition(lockFileName, newVendirLockContent));
		logger.debug("Adding Sync'd files to git");
		const status = await getRepoStatus();
		if (status) fileChanges.push(...fileChangesToArtifactResults(await collectFileChanges(status)));
		else logger.error("Failed to get git status");
		return fileChanges.length ? fileChanges : null;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to update Vendir lock file");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map