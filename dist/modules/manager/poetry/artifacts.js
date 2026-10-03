import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { toMs } from "../../../util/pretty-time.js";
import { massage, parse } from "../../../util/toml.js";
import { ensureCacheDir, getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { Result } from "../../../util/result.js";
import { findPypiIndexCredentials } from "../../datasource/pypi/host-rules.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { withGitEnvironment } from "../../../util/git/exec.js";
import { Lockfile, PoetryPyProject } from "./schema.js";
import { isNonEmptyArray, isNumber, isString } from "@sindresorhus/is";
import { Duration } from "luxon";
import { quote } from "shlex";
//#region lib/modules/manager/poetry/artifacts.ts
const gitExec = withGitEnvironment(["poetry"]);
function getPythonConstraint(pyProjectContent, existingLockFileContent) {
	const pyprojectPythonConstraint = Result.parse(massage(pyProjectContent), PoetryPyProject.transform(({ packageFileContent }) => packageFileContent.deps.find((dep) => dep.depName === "python")?.currentValue)).unwrapOrNull();
	if (pyprojectPythonConstraint) {
		logger.debug("Using python version from pyproject.toml");
		return pyprojectPythonConstraint;
	}
	const lockfilePythonConstraint = Result.parse(existingLockFileContent, Lockfile.transform(({ pythonVersions }) => pythonVersions)).unwrapOrNull();
	if (lockfilePythonConstraint) {
		logger.debug("Using python version from poetry.lock");
		return lockfilePythonConstraint;
	}
	return null;
}
function getPoetryRequirement(pyProjectContent, existingLockFileContent) {
	const firstLine = existingLockFileContent.split("\n")[0];
	const poetryVersionMatch = regEx(/by Poetry (?<version>[\d\\.]+)/).exec(firstLine);
	if (poetryVersionMatch?.groups?.version) {
		const poetryVersion = poetryVersionMatch.groups.version;
		logger.debug(`Using poetry version ${poetryVersion} from poetry.lock header`);
		return poetryVersion;
	}
	const { val: lockfilePoetryConstraint } = Result.parse(existingLockFileContent, Lockfile.transform(({ poetryConstraint }) => poetryConstraint)).unwrap();
	if (lockfilePoetryConstraint) {
		logger.debug(`Using poetry version ${lockfilePoetryConstraint} from poetry.lock metadata`);
		return lockfilePoetryConstraint;
	}
	const { val: pyprojectPoetryConstraint } = Result.parse(massage(pyProjectContent), PoetryPyProject.transform(({ poetryRequirement }) => poetryRequirement)).unwrap();
	if (pyprojectPoetryConstraint) {
		logger.debug(`Using poetry version ${pyprojectPoetryConstraint} from pyproject.toml`);
		return pyprojectPoetryConstraint;
	}
	return null;
}
function getPoetrySources(content, fileName) {
	let pyprojectFile;
	try {
		pyprojectFile = parse(massage(content));
	} catch (err) {
		logger.debug({ err }, "Error parsing pyproject.toml file");
		return [];
	}
	if (!pyprojectFile.tool?.poetry) {
		logger.debug(`${fileName} contains no poetry section`);
		return [];
	}
	const sources = coerceArray(pyprojectFile.tool?.poetry?.source);
	const sourceArray = [];
	for (const source of sources) if (source.name && source.url) sourceArray.push({
		name: source.name,
		url: source.url
	});
	return sourceArray;
}
async function getSourceCredentialVars(pyprojectContent, packageFileName) {
	const poetrySources = getPoetrySources(pyprojectContent, packageFileName);
	const envVars = {};
	for (const source of poetrySources) {
		const matchingHostRule = await findPypiIndexCredentials(source.url);
		const formattedSourceName = source.name.replace(regEx(/(?:\.|-)+/g), "_").toUpperCase();
		if (matchingHostRule.username) envVars[`POETRY_HTTP_BASIC_${formattedSourceName}_USERNAME`] = matchingHostRule.username;
		if (matchingHostRule.password) envVars[`POETRY_HTTP_BASIC_${formattedSourceName}_PASSWORD`] = matchingHostRule.password;
	}
	return envVars;
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`poetry.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (!isNonEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated poetry deps - returning null");
		return null;
	}
	let lockFileName = getSiblingFileName(packageFileName, "poetry.lock");
	let existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		lockFileName = getSiblingFileName(packageFileName, "pyproject.lock");
		existingLockFileContent = await readLocalFile(lockFileName, "utf8");
		if (!existingLockFileContent) {
			logger.debug(`No lock file found`);
			return null;
		}
	}
	const lockFileContent = existingLockFileContent;
	logger.debug(`Updating ${lockFileName}`);
	const cmd = [];
	if (isLockFileMaintenance) cmd.push("poetry update --lock --no-interaction");
	else cmd.push(`poetry update --lock --no-interaction ${updatedDeps.map((dep) => dep.depName).filter(isString).map((dep) => quote(dep)).join(" ")}`);
	try {
		return await updateLockFile({
			lockFileName,
			existingLockFileContent,
			packageFile: {
				path: packageFileName,
				contents: newPackageFileContent
			},
			deleteLockFile: isLockFileMaintenance,
			run: async () => {
				const pythonConstraint = await resolveToolConstraint(config, "python", () => getPythonConstraint(newPackageFileContent, lockFileContent));
				const poetryConstraint = await resolveToolConstraint(config, "poetry", () => getPoetryRequirement(newPackageFileContent, lockFileContent));
				const extraEnv = {
					...await getSourceCredentialVars(newPackageFileContent, packageFileName),
					PIP_CACHE_DIR: await ensureCacheDir("pip")
				};
				if (config.minimumReleaseAge) {
					const ageMs = toMs(config.minimumReleaseAge);
					if (isNumber(ageMs)) extraEnv.POETRY_SOLVER_MIN_RELEASE_AGE = Math.ceil(Duration.fromMillis(ageMs).as("days")).toString();
					else logger.debug({ minimumReleaseAge: config.minimumReleaseAge }, "Invalid minimumReleaseAge, skipping POETRY_SOLVER_MIN_RELEASE_AGE");
				}
				await gitExec(cmd, {
					cwdFile: packageFileName,
					extraEnv,
					docker: {},
					toolConstraints: [{
						toolName: "python",
						constraint: pythonConstraint
					}, {
						toolName: "poetry",
						constraint: poetryConstraint
					}]
				});
			}
		});
	} catch (err) {
		/* v8 ignore if -- defensive rethrow, not reproduced in the poetry specs */
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, `Failed to update ${lockFileName} file`);
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { getPoetryRequirement, getPythonConstraint, updateArtifacts };

//# sourceMappingURL=artifacts.js.map