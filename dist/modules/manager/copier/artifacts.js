import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { statLocalFile } from "../../../util/fs/index.js";
import { getRepoStatus, isFileModeEnabled } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactError, artifactErrorResult, resolveToolConstraint } from "../util.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/copier/artifacts.ts
const DEFAULT_COMMAND_OPTIONS = ["--skip-answered", "--defaults"];
const ownerExecutePermission = 64;
const gitExec = withGitEnvironment(["git-tags"]);
async function detectExecutable(path, canReadFileMode) {
	if (!canReadFileMode) return;
	const fileStats = await statLocalFile(path);
	if (!fileStats?.isFile()) return;
	if ((fileStats.mode & ownerExecutePermission) === 0) return;
	return true;
}
function buildCommand(config, packageFileName, newValue) {
	const command = [
		"copier",
		"update",
		...DEFAULT_COMMAND_OPTIONS
	];
	if (GlobalConfig.get("allowScripts") && !config.ignoreScripts) command.push("--trust");
	command.push("--answers-file", quote(upath.basename(packageFileName)), "--vcs-ref", quote(newValue));
	return command.join(" ");
}
async function updateArtifacts({ packageFileName, updatedDeps, config }) {
	if (updatedDeps?.length !== 1) return [artifactError(packageFileName, `Unexpected number of dependencies: ${updatedDeps?.length} (should be 1)`)];
	const newValue = updatedDeps[0]?.newValue;
	if (!newValue) return [artifactError(packageFileName, "Missing copier template version to update to")];
	const command = buildCommand(config, packageFileName, newValue);
	const execOptions = {
		cwdFile: packageFileName,
		docker: {},
		toolConstraints: [{
			toolName: "python",
			constraint: await resolveToolConstraint(config, "python")
		}, {
			toolName: "copier",
			constraint: await resolveToolConstraint(config, "copier")
		}]
	};
	try {
		await gitExec(command, execOptions);
	} catch (err) {
		logger.debug({ err }, `Failed to update copier template: ${err.message}`);
		return artifactErrorResult(packageFileName, err);
	}
	const status = await getRepoStatus();
	if (!status.modified.includes(packageFileName)) return null;
	const res = [];
	if (status.conflicted.length > 0) {
		const msg = `Updating the Copier template yielded ${status.conflicted.length} merge conflicts. Please check the proposed changes carefully! Conflicting files:\n  * ${status.conflicted.join("\n  * ")}`;
		logger.debug({
			packageFileName,
			depName: updatedDeps[0]?.depName
		}, msg);
		res.push(artifactError(packageFileName, msg));
	}
	const canReadFileMode = await isFileModeEnabled();
	const changes = await collectFileChanges(status, {
		include: [
			"modified",
			"not_added",
			"conflicted",
			"deleted",
			"renamed"
		],
		additionMetadata: async (f) => ({ isExecutable: await detectExecutable(f, canReadFileMode) })
	});
	for (const change of changes) {
		const fileRes = { file: change };
		if (change.type === "addition" && status.conflicted.includes(change.path)) fileRes.notice = {
			file: change.path,
			message: "This file had merge conflicts. Please check the proposed changes carefully!"
		};
		res.push(fileRes);
	}
	return res;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map