import { TEMPORARY_ERROR } from "../../constants/error-messages.js";
import { coerceObject } from "../object.js";
import { getCustomEnv, getUserEnv } from "../env.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceArray } from "../array.js";
import { logger } from "../../logger/index.js";
import { hardcodedProcessEnv } from "./env.js";
import { getChildEnv } from "./utils.js";
import { generateInstallCommands, isDynamicInstall } from "./containerbase.js";
import { rawExec } from "./common.js";
import { generateDockerCommand, removeDockerContainer } from "./docker/index.js";
import { getHermitEnvs, isHermit } from "./hermit.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
import upath from "upath";
//#region lib/util/exec/index.ts
function dockerEnvVars(extraEnv, childEnv) {
	return Object.keys(extraEnv).filter((key) => isNonEmptyString(childEnv[key]));
}
function getCwd({ cwd, cwdFile }) {
	const defaultCwd = GlobalConfig.get("localDir");
	return (cwdFile ? upath.join(defaultCwd, upath.dirname(cwdFile)) : cwd) ?? defaultCwd;
}
function getRawExecOptions(opts) {
	const defaultExecutionTimeout = GlobalConfig.get("executionTimeout");
	const childEnv = getChildEnv(opts);
	const cwd = getCwd(opts);
	let timeout = opts.timeout;
	timeout ??= defaultExecutionTimeout * 60 * 1e3;
	return {
		cwd,
		env: childEnv,
		maxBuffer: opts.maxBuffer ?? 10485760,
		timeout,
		...opts.shell !== void 0 && { shell: opts.shell },
		stdin: "pipe",
		stdout: opts.ignoreStdout ? "ignore" : "pipe",
		stderr: "pipe"
	};
}
function isDocker(docker) {
	return GlobalConfig.get("binarySource") === "docker" && !!docker;
}
async function prepareRawExec(cmd, opts, sideCarImage) {
	const { docker } = opts;
	const preCommands = coerceArray(opts.preCommands);
	const customEnvVariables = getCustomEnv();
	const userConfiguredEnv = getUserEnv();
	const { containerbaseDir, binarySource } = GlobalConfig.get();
	if (binarySource === "docker" || binarySource === "install") {
		logger.debug(`Setting CONTAINERBASE_CACHE_DIR to ${containerbaseDir}`);
		opts.env ??= {};
		opts.env.CONTAINERBASE_CACHE_DIR = containerbaseDir;
	}
	let rawOptions = getRawExecOptions(opts);
	let rawCommands = isString(cmd) ? [cmd] : cmd;
	if (isDocker(docker)) {
		logger.debug({ image: sideCarImage }, "Using docker to execute");
		const envVars = [
			...dockerEnvVars({
				...hardcodedProcessEnv,
				...opts.extraEnv,
				...customEnvVariables,
				...userConfiguredEnv
			}, getChildEnv(opts)),
			...coerceArray(docker.envVars),
			"CONTAINERBASE_CACHE_DIR"
		];
		const cwd = getCwd(opts);
		const dockerOptions = {
			...docker,
			cwd,
			envVars
		};
		rawCommands = [await generateDockerCommand(rawCommands, [...await generateInstallCommands(opts.toolConstraints), ...preCommands], dockerOptions, sideCarImage)];
	} else if (isDynamicInstall(opts.toolConstraints)) {
		logger.debug("Using containerbase dynamic installs");
		rawCommands = [
			...await generateInstallCommands(opts.toolConstraints, true),
			...preCommands,
			...rawCommands
		];
	} else if (isHermit()) {
		const hermitEnvVars = await getHermitEnvs(rawOptions);
		logger.debug({ hermitEnvVars }, "merging hermit environment variables into the execution options");
		rawOptions = {
			...rawOptions,
			env: {
				...rawOptions.env,
				...hermitEnvVars
			}
		};
	}
	if (GlobalConfig.get("binarySource") === "global" && opts.toolConstraints?.length) logger.once.debug({ toolConstraints: opts.toolConstraints }, "Ignoring tool contraints because of `binarySource=global`");
	return {
		rawCommands,
		rawOptions
	};
}
async function exec(cmd, opts = {}) {
	const { docker } = opts;
	const dockerChildPrefix = GlobalConfig.get("dockerChildPrefix");
	const sideCarImage = GlobalConfig.get("dockerSidecarImage");
	const { rawCommands, rawOptions } = await prepareRawExec(cmd, opts, sideCarImage);
	const useDocker = isDocker(docker);
	let res = {
		stdout: "",
		stderr: ""
	};
	for (const rawCmd of rawCommands) {
		const startTime = Date.now();
		if (useDocker) await removeDockerContainer(sideCarImage, dockerChildPrefix);
		logger.debug({
			command: rawCmd,
			env: Object.keys(coerceObject(rawOptions.env))
		}, "Executing command");
		logger.trace({ commandOptions: rawOptions }, "Command options");
		try {
			res = await rawExec(rawCmd, rawOptions);
		} catch (err) {
			const durationMs = Math.round(Date.now() - startTime);
			logger.debug({
				err,
				durationMs
			}, "rawExec err");
			if (useDocker) await removeDockerContainer(sideCarImage, dockerChildPrefix).catch((removeErr) => {
				const message = err.message;
				throw new Error(`Error: "${removeErr.message}" - Original Error: "${message}"`);
			});
			if (err.signal === `SIGTERM`) {
				logger.debug({ err }, "exec interrupted by SIGTERM - run needs to be aborted");
				throw new Error(TEMPORARY_ERROR);
			}
			throw err;
		}
		const durationMs = Math.round(Date.now() - startTime);
		logger.debug({
			durationMs,
			stdout: res.stdout,
			stderr: res.stderr
		}, "exec completed");
	}
	return res;
}
function getToolSettingsOptions(repoConfig) {
	let defaults = GlobalConfig.get("toolSettings");
	defaults ??= {
		jvmMaxMemory: 512,
		jvmMemory: 512
	};
	const jvmMaxMemory = defaults?.jvmMaxMemory ?? 512;
	const options = {
		jvmMaxMemory,
		jvmMemory: defaults?.jvmMemory ?? jvmMaxMemory,
		nodeMaxMemory: defaults?.nodeMaxMemory
	};
	if (repoConfig !== void 0) {
		if (repoConfig.jvmMaxMemory) {
			if (repoConfig.jvmMaxMemory > options.jvmMaxMemory) logger.once.debug(`A higher jvmMaxMemory (${repoConfig.jvmMaxMemory}) than the global configuration (${options.jvmMaxMemory}) is not permitted for Java VM invocations. Using global configuration instead`);
			options.jvmMaxMemory = Math.min(options.jvmMaxMemory, repoConfig.jvmMaxMemory);
		}
		if (repoConfig.jvmMemory) options.jvmMemory = repoConfig.jvmMemory;
		if (repoConfig.nodeMaxMemory) {
			if (options.nodeMaxMemory && repoConfig.nodeMaxMemory > options.nodeMaxMemory) logger.once.debug(`A higher nodeMaxMemory (${repoConfig.nodeMaxMemory}) than the global configuration (${options.nodeMaxMemory}) is not permitted for Node invocations. Using global configuration instead`);
			else options.nodeMaxMemory = repoConfig.nodeMaxMemory;
		}
	}
	options.jvmMaxMemory = Math.floor(options.jvmMaxMemory);
	options.jvmMemory = Math.floor(options.jvmMemory);
	if (options.nodeMaxMemory) options.nodeMaxMemory = Math.floor(options.nodeMaxMemory);
	options.jvmMemory = Math.min(options.jvmMemory, options.jvmMaxMemory);
	if (options.jvmMaxMemory < 512 || options.jvmMemory < 512) {
		options.jvmMaxMemory = Math.max(options.jvmMaxMemory, 512);
		logger.once.debug("Overriding low memory settings for Java VM invocations to a minimum of 512M");
		options.jvmMemory = Math.max(options.jvmMemory, 512);
	}
	return options;
}
function gradleJvmArg(config) {
	return ` -Dorg.gradle.jvmargs="-Xms${config.jvmMemory}m -Xmx${config.jvmMaxMemory}m"`;
}
//#endregion
export { exec, getToolSettingsOptions, gradleJvmArg };

//# sourceMappingURL=index.js.map