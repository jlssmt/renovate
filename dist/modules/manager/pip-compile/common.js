import { regEx } from "../../../util/regex.js";
import { coerceArray, isNotNullOrUndefined } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { ensureLocalPath } from "../../../util/fs/util.js";
import { ensureCacheDir } from "../../../util/fs/index.js";
import { findPypiIndexCredentials } from "../../datasource/pypi/host-rules.js";
import { resolveToolConstraint } from "../util.js";
import { split } from "shlex";
import upath from "upath";
//#region lib/modules/manager/pip-compile/common.ts
async function getPythonVersionConstraint(config, extractedPythonVersion) {
	return await resolveToolConstraint(config, "python", () => {
		if (extractedPythonVersion) {
			logger.debug("Using python constraint extracted from the lock file");
			return `==${extractedPythonVersion}`;
		}
	});
}
async function getToolVersionConstraint(config, commandType) {
	if (commandType === "uv") return {
		toolName: "uv",
		constraint: await resolveToolConstraint(config, "uv")
	};
	return {
		toolName: "pip-tools",
		constraint: await resolveToolConstraint(config, "pipTools")
	};
}
async function getExecOptions(config, commandType, cwd, extraEnv, extractedPythonVersion) {
	const constraint = await getPythonVersionConstraint(config, extractedPythonVersion);
	return {
		cwd: ensureLocalPath(cwd),
		docker: {},
		toolConstraints: [{
			toolName: "python",
			constraint
		}, await getToolVersionConstraint(config, commandType)],
		extraEnv: {
			PIP_CACHE_DIR: await ensureCacheDir("pip"),
			PIP_NO_INPUT: "true",
			PIP_KEYRING_PROVIDER: "import",
			PYTHON_KEYRING_BACKEND: "keyrings.envvars.keyring.EnvvarsKeyring",
			...extraEnv
		}
	};
}
const constraintLineRegex = regEx(/^(?:#.*?\r?\n)+# {4}(?<command>\S*)(?<arguments> .*?)?\r?\n/);
const disallowedPipOptions = ["--no-header"];
const commonOptionsWithArguments = [
	"--output-file",
	"--extra",
	"--extra-index-url"
];
const pipOptionsWithArguments = [
	"--resolver",
	"--constraint",
	...commonOptionsWithArguments
];
const uvOptionsWithArguments = [
	"--constraints",
	"--constraint",
	"--python-version",
	"--no-emit-package",
	"--prerelease",
	"--format",
	"--resolution",
	"--fork-strategy",
	"--exclude-newer",
	"--exclude-newer-package",
	"--group",
	"--override",
	"--overrides",
	...commonOptionsWithArguments
];
const optionsWithArguments = [...pipOptionsWithArguments, ...uvOptionsWithArguments];
const allowedCommonOptions = [
	"-v",
	"--generate-hashes",
	"--emit-index-url",
	"--index-url",
	"--all-extras"
];
const allowedOptions = {
	"pip-compile": [
		"--allow-unsafe",
		"--generate-hashes",
		"--no-emit-index-url",
		"--strip-extras",
		...allowedCommonOptions,
		...pipOptionsWithArguments
	],
	uv: [
		"--no-strip-extras",
		"--universal",
		...allowedCommonOptions,
		...uvOptionsWithArguments
	],
	custom: []
};
function extractHeaderCommand(content, fileName) {
	const compileCommand = constraintLineRegex.exec(content);
	if (compileCommand?.groups === void 0) throw new Error(`Failed to extract command from header in ${fileName} ${content}`);
	logger.trace(`pip-compile: found header in ${fileName}: \n${compileCommand[0]}`);
	const command = compileCommand.groups.command;
	const argv = [command];
	let commandType;
	if (command === "pip-compile") commandType = "pip-compile";
	else if (command === "uv") commandType = "uv";
	else commandType = "custom";
	// v8 ignore else -- a compile command always records its arguments
	if (compileCommand.groups.arguments) argv.push(...split(compileCommand.groups.arguments));
	logger.debug({
		fileName,
		argv,
		commandType
	}, `pip-compile: extracted command from header`);
	const result = {
		argv,
		command,
		commandType,
		outputFile: "",
		sourceFiles: []
	};
	for (const arg of argv.slice(1)) {
		if (commandType === "uv" && ["pip", "compile"].includes(arg)) continue;
		if (!arg.startsWith("-")) {
			result.sourceFiles.push(arg);
			continue;
		}
		throwForDisallowedOption(arg);
		throwForNoEqualSignInOptionWithArgument(arg);
		throwForUnknownOption(commandType, arg);
		if (arg.includes("=")) {
			const [option, value] = arg.split("=");
			if (option === "--extra") {
				result.extra = coerceArray(result.extra);
				result.extra.push(value);
			} else if (option === "--extra-index-url") {
				result.extraIndexUrl = coerceArray(result.extraIndexUrl);
				result.extraIndexUrl.push(value);
			} else if (["--constraint", "--constraints"].includes(option)) {
				result.constraintsFiles = coerceArray(result.constraintsFiles);
				result.constraintsFiles.push(value);
			} else if (["--override", "--overrides"].includes(option)) {
				result.overridesFiles = coerceArray(result.overridesFiles);
				result.overridesFiles.push(value);
			} else if (option === "--output-file") {
				if (result.outputFile) throw new Error("Cannot use multiple --output-file options");
				result.outputFile = upath.normalize(value);
			} else if (option === "--python-version") result.pythonVersion = value;
			else if (option === "--index-url") {
				if (result.indexUrl) throw new Error("Cannot use multiple --index-url options");
				result.indexUrl = value;
			} else logger.debug({ option }, `pip-compile: option not handled`);
			continue;
		}
		if (arg === "--no-emit-index-url") {
			result.noEmitIndexUrl = true;
			continue;
		}
		if (arg === "--emit-index-url") {
			result.emitIndexUrl = true;
			continue;
		}
		if (arg === "--all-extras") {
			result.allExtras = true;
			continue;
		}
		logger.debug({ option: arg }, `pip-compile: option not handled`);
	}
	logger.trace({ ...result }, "Parsed pip-compile command from header");
	if (result.noEmitIndexUrl && result.emitIndexUrl) throw new Error("Cannot use both --no-emit-index-url and --emit-index-url");
	if (result.sourceFiles.length === 0) throw new Error("No source files detected in command, pass at least one package file explicitly");
	return result;
}
const pythonVersionRegex = regEx(/^(?:#.*?\r?\n)*# This file is autogenerated by pip-compile with Python (?<pythonVersion>\d+(?:\.\d+)*)\s/, "i");
function extractPythonVersion(content, fileName) {
	const match = pythonVersionRegex.exec(content);
	if (match?.groups === void 0) {
		logger.warn({
			fileName,
			content
		}, "pip-compile: failed to extract Python version from header in file");
		return;
	}
	logger.trace(`pip-compile: found Python version header in ${fileName}: \n${match[0]}`);
	const { pythonVersion } = match.groups;
	logger.debug({
		fileName,
		pythonVersion
	}, `pip-compile: extracted Python version from header`);
	return pythonVersion;
}
function throwForDisallowedOption(arg) {
	if (disallowedPipOptions.includes(arg)) throw new Error(`Option ${arg} not allowed for this manager`);
}
function throwForNoEqualSignInOptionWithArgument(arg) {
	if (optionsWithArguments.includes(arg)) throw new Error(`Option ${arg} must have equal sign '=' separating it's argument`);
}
function throwForUnknownOption(commandType, arg) {
	if (arg.includes("=")) {
		const [option] = arg.split("=");
		if (allowedOptions[commandType].includes(option)) return;
	}
	if (allowedOptions[commandType].includes(arg)) return;
	throw new Error(`Option ${arg} not supported (yet)`);
}
async function getRegistryCredEnvVars(url, index) {
	const { username, password } = await findPypiIndexCredentials(url.href);
	const ret = {};
	if (!!username || !!password) {
		ret[`KEYRING_SERVICE_NAME_${index}`] = url.hostname;
		ret[`KEYRING_SERVICE_USERNAME_${index}`] = username ?? "";
		ret[`KEYRING_SERVICE_PASSWORD_${index}`] = password ?? "";
	}
	return ret;
}
async function getRegistryCredVarsFromPackageFiles(packageFiles) {
	const urls = [];
	for (const packageFile of packageFiles) urls.push(...coerceArray(packageFile.registryUrls), ...coerceArray(packageFile.additionalRegistryUrls));
	logger.debug(urls, "Extracted registry URLs from package files");
	const parsedUrls = urls.map(parseUrl).filter(isNotNullOrUndefined);
	let allCreds = {};
	for (const [index, url] of parsedUrls.entries()) {
		const hostCreds = await getRegistryCredEnvVars(url, index);
		allCreds = {
			...allCreds,
			...hostCreds
		};
	}
	return allCreds;
}
function matchManager(filename) {
	if (filename.endsWith("setup.py")) return "pip_setup";
	if (filename.endsWith("setup.cfg")) return "setup-cfg";
	if (filename.endsWith("pyproject.toml")) return "pep621";
	if (filename.endsWith(".in") || filename.endsWith(".txt")) return "pip_requirements";
	return "unknown";
}
//#endregion
export { allowedOptions, constraintLineRegex, disallowedPipOptions, extractHeaderCommand, extractPythonVersion, getExecOptions, getPythonVersionConstraint, getRegistryCredVarsFromPackageFiles, getToolVersionConstraint, matchManager, optionsWithArguments };

//# sourceMappingURL=common.js.map