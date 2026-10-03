import "../../../constants/error-messages.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { deleteLocalFile, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
//#region lib/modules/manager/bazel-module/lockfile.ts
async function updateBazelLockfile(lockFileName, cwdFile, isLockFileMaintenance, bazeliskConstraint) {
	try {
		const allowlist = GlobalConfig.get("allowedUnsafeExecutions");
		const command = "bazel mod deps --lockfile_mode=update";
		if (!allowlist.includes("bazelModDeps")) {
			logger.once.warn({ command }, "Bazel command was requested to run, but `bazelModDeps` is not permitted in the allowedUnsafeExecutions");
			return null;
		}
		if (isLockFileMaintenance) await deleteLocalFile(lockFileName);
		await exec(command, {
			cwdFile,
			docker: {},
			toolConstraints: [{
				toolName: "bazelisk",
				constraint: bazeliskConstraint
			}]
		});
		const status = await getRepoStatus();
		if (!status.modified.includes(lockFileName) && !status.not_added?.includes(lockFileName)) return null;
		return [{ file: {
			type: "addition",
			path: lockFileName,
			contents: await readLocalFile(lockFileName, "utf8")
		} }];
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.warn({
			lockFile: lockFileName,
			err
		}, "Failed to update MODULE.bazel.lock");
		return [{ artifactError: {
			fileName: lockFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { updateBazelLockfile };

//# sourceMappingURL=lockfile.js.map