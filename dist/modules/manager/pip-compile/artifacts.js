import "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { deleteLocalFile, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { extractPackageFileFlags } from "../pip_requirements/common.js";
import { extractHeaderCommand, extractPythonVersion, getExecOptions, getRegistryCredVarsFromPackageFiles, matchManager } from "./common.js";
import { inferCommandExecDir } from "./utils.js";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/pip-compile/artifacts.ts
function haveCredentialsInPipEnvironmentVariables() {
	const env = getEnv();
	if (env.PIP_INDEX_URL) {
		const indexUrl = parseUrl(env.PIP_INDEX_URL);
		if (!indexUrl) return true;
		if (!!indexUrl.username || !!indexUrl.password) return true;
	}
	if (env.PIP_EXTRA_INDEX_URL) return env.PIP_EXTRA_INDEX_URL.split(" ").some((urlString) => {
		const url = parseUrl(urlString);
		if (!url) return true;
		return !!url.username || !!url.password;
	});
	return false;
}
function constructPipCompileCmd(compileArgs, upgradePackages = []) {
	if (compileArgs.commandType === "custom") throw new Error("Detected custom command, header modified or set by CUSTOM_COMPILE_COMMAND");
	if (!compileArgs.outputFile) logger.debug(`pip-compile: implicit output file`);
	if (compileArgs.commandType === "pip-compile" && !compileArgs.noEmitIndexUrl && !compileArgs.emitIndexUrl && haveCredentialsInPipEnvironmentVariables()) compileArgs.argv.splice(1, 0, "--no-emit-index-url");
	for (const dep of upgradePackages) compileArgs.argv.push(`--upgrade-package=${quote(`${dep.depName}==${dep.newVersion}`)}`);
	return compileArgs.argv.map(quote).join(" ");
}
async function updateArtifacts({ packageFileName: inputFileName, newPackageFileContent: newInputContent, updatedDeps, config }) {
	if (!config.lockFiles) {
		logger.warn({ packageFileName: inputFileName }, "pip-compile: No lock files associated with a package file");
		return null;
	}
	logger.debug(`pipCompile.updateArtifacts(${inputFileName}->${JSON.stringify(config.lockFiles)})`);
	const result = [];
	for (const outputFileName of config.lockFiles) {
		const existingOutput = await readLocalFile(outputFileName, "utf8");
		if (!existingOutput) {
			logger.debug("pip-compile: No output file found");
			return null;
		}
		try {
			await writeLocalFile(inputFileName, newInputContent);
			if (config.isLockFileMaintenance) await deleteLocalFile(outputFileName);
			const compileArgs = extractHeaderCommand(existingOutput, outputFileName);
			let pythonVersion;
			if (compileArgs.commandType === "uv") pythonVersion = compileArgs.pythonVersion;
			else pythonVersion = extractPythonVersion(existingOutput, outputFileName);
			const cwd = inferCommandExecDir(outputFileName, compileArgs.outputFile);
			const upgradePackages = updatedDeps.filter((dep) => dep.isLockfileUpdate);
			const packageFiles = [];
			for (const name of compileArgs.sourceFiles) if (matchManager(name) === "pip_requirements") {
				const path = upath.join(cwd, name);
				const content = await readLocalFile(path, "utf8");
				if (content) {
					const packageFile = extractPackageFileFlags(content);
					packageFiles.push(packageFile);
				}
			}
			const cmd = constructPipCompileCmd(compileArgs, upgradePackages);
			const registryCredVars = await getRegistryCredVarsFromPackageFiles(packageFiles);
			const execOptions = await getExecOptions(config, compileArgs.commandType, cwd, registryCredVars, pythonVersion);
			logger.trace({
				cwd,
				cmd,
				registryCredVars: Object.keys(registryCredVars)
			}, "pip-compile command");
			await exec(cmd, execOptions);
			if ((await getRepoStatus())?.modified.includes(outputFileName)) result.push({ file: {
				type: "addition",
				path: outputFileName,
				contents: await readLocalFile(outputFileName, "utf8")
			} });
		} catch (err) {
			// istanbul ignore if
			if (err.message === "temporary-error") throw err;
			logger.debug({ err }, "pip-compile: Failed to run command");
			result.push({ artifactError: {
				fileName: outputFileName,
				stderr: err.message
			} });
		}
	}
	logger.debug("pip-compile: Returning updated output file(s)");
	return result.length === 0 ? null : result;
}
//#endregion
export { constructPipCompileCmd, updateArtifacts };

//# sourceMappingURL=artifacts.js.map