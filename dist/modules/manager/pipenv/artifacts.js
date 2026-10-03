import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { ensureLocalPath } from "../../../util/fs/util.js";
import { deleteLocalFile, ensureCacheDir, getParentDir, localPathExists, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { findPypiIndexCredentials } from "../../datasource/pypi/host-rules.js";
import { resolveToolConstraint } from "../util.js";
import { extractPackageFile } from "./extract.js";
import { isNonEmptyStringAndNotWhitespace, isUrlInstance } from "@sindresorhus/is";
import { pipenv } from "@renovatebot/detect-tools";
//#region lib/modules/manager/pipenv/artifacts.ts
async function findPipfileSourceUrlsWithCredentials(pipfileContent, pipfileName) {
	const pipfile = await extractPackageFile(pipfileContent, pipfileName);
	return coerceArray(pipfile?.registryUrls?.map(parseUrl).filter(isUrlInstance).filter((url) => isNonEmptyStringAndNotWhitespace(url.username)));
}
/**
* This will extract the actual variable name from an environment-placeholder:
* ${USERNAME:-defaultvalue} will yield 'USERNAME'
*/
function extractEnvironmentVariableName(credential) {
	const match = regEx("([a-z0-9_]+)", "i").exec(decodeURI(credential));
	return match?.length ? match[0] : null;
}
function addExtraEnvVariable(extraEnv, environmentVariableName, environmentValue) {
	logger.trace(`Adding ${environmentVariableName} environment variable for pipenv`);
	if (extraEnv[environmentVariableName] && extraEnv[environmentVariableName] !== environmentValue) logger.warn({ envVar: environmentVariableName }, "Possible misconfiguration, environment variable already set to a different value");
	extraEnv[environmentVariableName] = environmentValue;
}
/**
* Pipenv allows configuring source-urls for remote repositories with placeholders for credentials, i.e. http://$USER:$PASS@myprivate.repo
* if a matching host rule exists for that repository, we need to set the corresponding variables.
* Simply substituting them in the URL is not an option as it would impact the hash for the resulting Pipfile.lock
*
*/
async function addCredentialsForSourceUrls(newPipfileContent, pipfileName, extraEnv) {
	const sourceUrls = await findPipfileSourceUrlsWithCredentials(newPipfileContent, pipfileName);
	for (const parsedSourceUrl of sourceUrls) {
		logger.trace(`Trying to add credentials for ${parsedSourceUrl.toString()}`);
		const credentials = await findPypiIndexCredentials(parsedSourceUrl.toString());
		const usernameVariableName = extractEnvironmentVariableName(parsedSourceUrl.username);
		// v8 ignore else -- needs a host rule carrying only one of the two
		if (credentials.username && usernameVariableName) addExtraEnvVariable(extraEnv, usernameVariableName, credentials.username);
		const passwordVariableName = extractEnvironmentVariableName(parsedSourceUrl.password);
		// v8 ignore else -- needs a host rule carrying only one of the two
		if (credentials.password && passwordVariableName) addExtraEnvVariable(extraEnv, passwordVariableName, credentials.password);
	}
}
async function updateArtifacts({ packageFileName: pipfileName, newPackageFileContent: newPipfileContent, config }) {
	logger.debug(`pipenv.updateArtifacts(${pipfileName})`);
	const lockFileName = `${pipfileName}.lock`;
	if (!await localPathExists(lockFileName)) {
		logger.debug("No Pipfile.lock found");
		return null;
	}
	try {
		await writeLocalFile(pipfileName, newPipfileContent);
		if (config.isLockFileMaintenance) await deleteLocalFile(lockFileName);
		const cmd = "pipenv lock";
		const pipfileDir = getParentDir(ensureLocalPath(pipfileName));
		const tagConstraint = await resolveToolConstraint(config, "python", () => pipenv.getPythonConstraint(pipfileDir));
		const pipenvConstraint = await resolveToolConstraint(config, "pipenv", () => pipenv.getPipenvConstraint(pipfileDir));
		const extraEnv = {
			PIPENV_CACHE_DIR: await ensureCacheDir("pipenv"),
			PIP_CACHE_DIR: await ensureCacheDir("pip"),
			WORKON_HOME: await ensureCacheDir("virtualenvs")
		};
		const execOptions = {
			cwdFile: pipfileName,
			docker: {},
			toolConstraints: [{
				toolName: "python",
				constraint: tagConstraint
			}, {
				toolName: "pipenv",
				constraint: pipenvConstraint
			}]
		};
		await addCredentialsForSourceUrls(newPipfileContent, pipfileName, extraEnv);
		execOptions.extraEnv = extraEnv;
		logger.trace({ cmd }, "pipenv lock command");
		await exec(cmd, execOptions);
		if (!(await getRepoStatus())?.modified.includes(lockFileName)) return null;
		logger.debug("Returning updated Pipfile.lock");
		return [{ file: {
			type: "addition",
			path: lockFileName,
			contents: await readLocalFile(lockFileName, "utf8")
		} }];
	} catch (err) {
		// istanbul ignore if
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to update Pipfile.lock");
		return [{ artifactError: {
			fileName: lockFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { addExtraEnvVariable, extractEnvironmentVariableName, updateArtifacts };

//# sourceMappingURL=artifacts.js.map