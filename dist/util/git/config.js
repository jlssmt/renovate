import { getEnv } from "../env.js";
import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { isArray, isNumber, isString } from "@sindresorhus/is";
//#region lib/util/git/config.ts
let noVerify = ["push", "commit"];
function setNoVerify(value) {
	if (!isArray(value, isString)) throw new Error("config error: gitNoVerify should be an array of strings");
	noVerify = value;
}
function getNoVerify() {
	return noVerify;
}
function simpleGitConfig() {
	const unsafe = {
		allowUnsafeSshCommand: true,
		allowUnsafeConfigEnvCount: true,
		allowUnsafeAskPass: true
	};
	if (getEnv().RENOVATE_X_CLEAR_HOOKS) unsafe.allowUnsafeHooksPath = true;
	const config = {
		completion: {
			onClose: true,
			onExit: false
		},
		config: ["core.quotePath=false"],
		unsafe
	};
	const gitTimeout = GlobalConfig.get("gitTimeout");
	if (isNumber(gitTimeout) && gitTimeout > 0) config.timeout = { block: gitTimeout };
	return config;
}
function addGitConfigEnvironmentVariables(environment, entries) {
	let gitConfigCount = getGitConfigCount(environment.GIT_CONFIG_COUNT);
	const newEnvironment = { ...environment };
	for (const entry of entries) {
		newEnvironment[`GIT_CONFIG_KEY_${gitConfigCount}`] = entry.key;
		newEnvironment[`GIT_CONFIG_VALUE_${gitConfigCount}`] = entry.value;
		gitConfigCount++;
	}
	newEnvironment.GIT_CONFIG_COUNT = gitConfigCount.toString();
	return newEnvironment;
}
function getGitConfigCount(value) {
	if (!value) return 0;
	const gitConfigCount = parseInt(value, 10);
	if (Number.isNaN(gitConfigCount)) {
		logger.warn({ GIT_CONFIG_COUNT: value }, `Found GIT_CONFIG_COUNT env variable, but could not parse the value to an integer. Ignoring it.`);
		return 0;
	}
	return gitConfigCount;
}
//#endregion
export { addGitConfigEnvironmentVariables, getNoVerify, setNoVerify, simpleGitConfig };

//# sourceMappingURL=config.js.map