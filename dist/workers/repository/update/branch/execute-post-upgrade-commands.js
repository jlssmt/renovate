import { regEx } from "../../../../util/regex.js";
import { GlobalConfig } from "../../../../config/global.js";
import { coerceArray } from "../../../../util/array.js";
import { minimatch } from "../../../../util/minimatch.js";
import { sanitize } from "../../../../util/sanitize.js";
import { addMeta, logger } from "../../../../logger/index.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import { compile } from "../../../../util/template/index.js";
import { isConstraintName, isToolName } from "../../../../util/exec/types.js";
import { ensureLocalDir, localPathIsFile, outputCacheFile, privateCacheDir, readLocalFile, statLocalFile, writeLocalFile } from "../../../../util/fs/index.js";
import { getRepoStatus, isFileModeEnabled } from "../../../../util/git/index.js";
import { withGitEnvironment } from "../../../../util/git/exec.js";
import "../../../../config/index.js";
import { isArray, isNonEmptyArray, isString } from "@sindresorhus/is";
import crypto from "node:crypto";
import upath from "upath";
//#region lib/workers/repository/update/branch/execute-post-upgrade-commands.ts
const ownerExecutePermission = 64;
const gitExec = withGitEnvironment();
async function detectExecutable(relativePath, canReadFileMode) {
	if (!canReadFileMode) return;
	const fileStats = await statLocalFile(relativePath);
	if (!fileStats?.isFile()) return;
	if ((fileStats.mode & ownerExecutePermission) === 0) return;
	return true;
}
async function postUpgradeCommandsExecutor(filteredUpgradeCommands, config) {
	let updatedArtifacts = [...coerceArray(config.updatedArtifacts)];
	const artifactErrors = [...coerceArray(config.artifactErrors)];
	const allowedCommands = GlobalConfig.get("allowedCommands");
	for (const upgrade of filteredUpgradeCommands) {
		addMeta({ dep: upgrade.depName });
		logger.trace({
			tasks: upgrade.postUpgradeTasks,
			allowedCommands
		}, `Checking for post-upgrade tasks`);
		const commands = upgrade.postUpgradeTasks?.commands;
		const dataFileTemplate = upgrade.postUpgradeTasks?.dataFileTemplate;
		const fileFilters = upgrade.postUpgradeTasks?.fileFilters ?? ["**/*"];
		if (isNonEmptyArray(commands)) {
			const previouslyModifiedFiles = config.updatedPackageFiles.concat(updatedArtifacts);
			for (const file of previouslyModifiedFiles) {
				const canWriteFile = await localPathIsFile(file.path);
				if (file.type === "addition" && !file.isSymlink && canWriteFile) {
					let contents;
					if (isString(file.contents)) contents = Buffer.from(file.contents);
					else contents = file.contents;
					await writeLocalFile(file.path, contents);
				}
			}
			let dataFilePath = null;
			if (dataFileTemplate) {
				const dataFileContent = sanitize(compile(dataFileTemplate, mergeChildConfig(config, upgrade)));
				logger.debug({ dataFileTemplate }, "Processed post-upgrade commands data file template.");
				const dataFileName = `post-upgrade-data-file-${crypto.randomBytes(8).toString("hex")}.tmp`;
				dataFilePath = upath.join(privateCacheDir(), dataFileName);
				try {
					await outputCacheFile(dataFilePath, dataFileContent);
					logger.debug({
						dataFilePath,
						dataFileContent
					}, "Created post-upgrade commands data file.");
				} catch (error) {
					artifactErrors.push({ stderr: sanitize(`Failed to create post-upgrade commands data file at ${dataFilePath}, reason: ${error.message}`) });
					dataFilePath = null;
				}
			}
			const workingDirTemplate = upgrade.postUpgradeTasks?.workingDirTemplate;
			let workingDir = GlobalConfig.get("localDir");
			if (workingDirTemplate) {
				workingDir = sanitize(compile(workingDirTemplate, mergeChildConfig(config, upgrade)));
				workingDir = await ensureLocalDir(workingDir);
				logger.trace({ workingDirTemplate }, "Processed post-upgrade commands working directory template.");
			}
			for (const cmd of commands) {
				const compiledCmd = compile(cmd, mergeChildConfig(config, upgrade));
				if (compiledCmd !== cmd) logger.debug({
					rawCmd: cmd,
					compiledCmd
				}, "Post-upgrade command has been compiled");
				if (compiledCmd === "") {
					logger.trace({ rawCmd: cmd }, "Skipping empty post-upgrade task");
					continue;
				}
				if (allowedCommands.some((pattern) => regEx(pattern).test(compiledCmd))) try {
					logger.trace({ cmd: compiledCmd }, "Executing post-upgrade task");
					const execOpts = {
						shell: GlobalConfig.get("allowShellExecutorForPostUpgradeCommands"),
						cwd: workingDir
					};
					if (dataFilePath) execOpts.env = { RENOVATE_POST_UPGRADE_COMMAND_DATA_FILE: dataFilePath };
					if (upgrade.postUpgradeTasks?.installTools) {
						execOpts.toolConstraints ??= [];
						for (const [tool] of Object.entries(upgrade.postUpgradeTasks?.installTools)) {
							const validTool = isToolName(tool);
							const validConstraint = isConstraintName(tool);
							if (!validTool) {
								logger.warn({
									tool,
									validTool,
									validConstraint
								}, "Skipping constraint that is not a tool that Containerbase knows");
								continue;
							}
							execOpts.toolConstraints.push({
								toolName: tool,
								constraint: upgrade.constraints?.[tool]
							});
						}
					}
					const execResult = await gitExec(compiledCmd, execOpts);
					logger.debug({
						cmd: compiledCmd,
						...execResult
					}, "Executed post-upgrade task");
				} catch (error) {
					artifactErrors.push({
						fileName: upgrade.packageFile,
						stderr: sanitize(error.message)
					});
				}
				else {
					logger.warn({
						cmd: compiledCmd,
						allowedCommands
					}, "Post-upgrade task did not match any on allowedCommands list");
					artifactErrors.push({
						fileName: upgrade.packageFile,
						stderr: sanitize(`Post-upgrade command '${compiledCmd}' has not been added to the allowed list in allowedCommands`)
					});
				}
			}
			const status = await getRepoStatus();
			logger.trace({ status }, "git status after post-upgrade tasks");
			logger.debug({
				addedCount: status.not_added?.length,
				modifiedCount: status.modified?.length,
				deletedCount: status.deleted?.length,
				renamedCount: status.renamed?.length
			}, "git status counts after post-upgrade tasks");
			const addedOrModifiedFiles = [
				...coerceArray(status.not_added),
				...coerceArray(status.modified),
				...coerceArray(status.renamed?.map((x) => x.to))
			];
			const changedFiles = [
				...addedOrModifiedFiles,
				...coerceArray(status.deleted),
				...coerceArray(status.renamed?.map((x) => x.from))
			];
			const previouslyDeletedFiles = updatedArtifacts.filter((ua) => ua.type === "deletion");
			for (const previouslyDeletedFile of previouslyDeletedFiles)
 /* v8 ignore if -- TODO: needs test */
			if (!changedFiles.includes(previouslyDeletedFile.path)) {
				logger.debug({ file: previouslyDeletedFile.path }, "Previously deleted file has been restored without modification");
				updatedArtifacts = updatedArtifacts.filter((ua) => !(ua.type === "deletion" && ua.path === previouslyDeletedFile.path));
			}
			logger.trace({ addedOrModifiedFiles }, "Added or modified files");
			logger.debug(`Checking ${addedOrModifiedFiles.length} added or modified files for post-upgrade changes`);
			const fileExcludes = [];
			if (config.npmrc) fileExcludes.push(".npmrc");
			const canReadFileMode = await isFileModeEnabled();
			for (const relativePath of addedOrModifiedFiles) {
				if (fileExcludes.some((pattern) => minimatch(pattern, { dot: true }).match(relativePath))) continue;
				let fileMatched = false;
				for (const pattern of fileFilters) if (minimatch(pattern, { dot: true }).match(relativePath)) {
					fileMatched = true;
					logger.debug({
						file: relativePath,
						pattern
					}, "Post-upgrade file saved");
					const existingContent = await readLocalFile(relativePath);
					const isExecutable = await detectExecutable(relativePath, canReadFileMode);
					const existingUpdatedArtifacts = updatedArtifacts.find((ua) => ua.path === relativePath);
					if (existingUpdatedArtifacts?.type === "addition") {
						existingUpdatedArtifacts.contents = existingContent;
						if (isExecutable !== void 0) existingUpdatedArtifacts.isExecutable = isExecutable;
					} else {
						const updatedArtifact = {
							type: "addition",
							path: relativePath,
							contents: existingContent
						};
						if (isExecutable !== void 0) updatedArtifact.isExecutable = isExecutable;
						updatedArtifacts.push(updatedArtifact);
					}
					updatedArtifacts = updatedArtifacts.filter((ua) => !(ua.type === "deletion" && ua.path === relativePath));
				}
				if (!fileMatched) logger.debug({ file: relativePath }, "Post-upgrade file did not match any file filters");
			}
			for (const relativePath of coerceArray(status.deleted)) for (const pattern of fileFilters) if (minimatch(pattern, { dot: true }).match(relativePath)) {
				if (!updatedArtifacts.some((ua) => ua.path === relativePath && ua.type === "deletion")) {
					logger.debug({
						file: relativePath,
						pattern
					}, "Post-upgrade file removed");
					updatedArtifacts.push({
						type: "deletion",
						path: relativePath
					});
				}
				updatedArtifacts = updatedArtifacts.filter((ua) => !(ua.type === "addition" && ua.path === relativePath));
			}
		}
	}
	return {
		updatedArtifacts,
		artifactErrors
	};
}
async function executePostUpgradeCommands(config) {
	if (!(isArray(config.updatedPackageFiles) && config.updatedPackageFiles.length > 0 || isArray(config.updatedArtifacts) && config.updatedArtifacts.length > 0)) {
		logger.debug("No changes to package files, skipping post-upgrade tasks");
		return null;
	}
	const branchUpgradeCommands = [{
		manager: config.manager,
		depName: config.upgrades.map(({ depName }) => depName).join(" "),
		branchName: config.branchName,
		postUpgradeTasks: config.postUpgradeTasks.executionMode === "branch" ? config.postUpgradeTasks : void 0
	}];
	const { updatedArtifacts, artifactErrors } = await postUpgradeCommandsExecutor(config.upgrades.filter(({ postUpgradeTasks }) => !postUpgradeTasks?.executionMode || postUpgradeTasks.executionMode === "update"), config);
	return postUpgradeCommandsExecutor(branchUpgradeCommands, {
		...config,
		updatedArtifacts,
		artifactErrors
	});
}
//#endregion
export { executePostUpgradeCommands as default, postUpgradeCommandsExecutor };

//# sourceMappingURL=execute-post-upgrade-commands.js.map