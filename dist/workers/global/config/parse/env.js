import { logger } from "../../../../logger/index.js";
import { getOptions } from "../../../../config/options/index.js";
import { parseJson } from "../../../../util/common.js";
import { migrateAndValidateConfig } from "./util.js";
import { coersions } from "./coersions.js";
import { getEnvName } from "../../../../config/options/env.js";
import { isArray } from "@sindresorhus/is";
import JSON5 from "json5";
//#region lib/workers/global/config/parse/env.ts
function normalizePrefixes(env, prefix) {
	const result = { ...env };
	if (prefix) {
		for (const [key, val] of Object.entries(result)) if (key.startsWith(prefix)) {
			const newKey = key.replace(prefix, "RENOVATE_");
			result[newKey] = val;
			delete result[key];
		}
	}
	return result;
}
const renameKeys = {
	aliases: "registryAliases",
	azureAutoComplete: "platformAutomerge",
	gitLabAutomerge: "platformAutomerge",
	mergeConfidenceApiBaseUrl: "mergeConfidenceEndpoint",
	mergeConfidenceSupportedDatasources: "mergeConfidenceDatasources",
	allowedPostUpgradeCommands: "allowedCommands",
	baseBranches: "baseBranchPatterns"
};
function renameEnvKeys(env) {
	const result = { ...env };
	for (const [from, to] of Object.entries(renameKeys)) {
		const fromKey = getEnvName({ name: from });
		const toKey = getEnvName({ name: to });
		if (env[fromKey]) {
			result[toKey] = env[fromKey];
			delete result[fromKey];
		}
	}
	return result;
}
const migratedKeysWithValues = [{
	oldName: "recreateClosed",
	newName: "recreateWhen",
	from: "true",
	to: "always"
}, {
	oldName: "recreateClosed",
	newName: "recreateWhen",
	from: "false",
	to: "auto"
}];
function massageEnvKeyValues(env) {
	const result = { ...env };
	for (const { oldName, newName, from, to } of migratedKeysWithValues) {
		const key = getEnvName({ name: oldName });
		if (env[key] !== void 0 && result[key] === from) {
			delete result[key];
			result[getEnvName({ name: newName })] = to;
		}
	}
	return result;
}
const convertedExperimentalEnvVars = /* @__PURE__ */ new Map([
	["RENOVATE_X_AUTODISCOVER_REPO_SORT", { optionName: "autodiscoverRepoSort" }],
	["RENOVATE_X_AUTODISCOVER_REPO_ORDER", { optionName: "autodiscoverRepoOrder" }],
	["RENOVATE_X_DOCKER_MAX_PAGES", { optionName: "dockerMaxPages" }],
	["RENOVATE_X_DELETE_CONFIG_FILE", { optionName: "deleteConfigFile" }],
	["RENOVATE_X_S3_ENDPOINT", { optionName: "s3Endpoint" }],
	["RENOVATE_X_S3_PATH_STYLE", { optionName: "s3PathStyle" }],
	["RENOVATE_X_MERGE_CONFIDENCE_API_BASE_URL", { optionName: "mergeConfidenceEndpoint" }],
	["RENOVATE_X_MERGE_CONFIDENCE_SUPPORTED_DATASOURCES", { optionName: "mergeConfidenceDatasources" }],
	["RENOVATE_X_REPO_CACHE_FORCE_LOCAL", {
		optionName: "repositoryCacheForceLocal",
		normalizeValue: (v) => v ? "true" : v
	}]
]);
/**
* Massages the experimental env vars which have been converted to config options
*
* e.g. RENOVATE_X_AUTODISCOVER_REPO_SORT -> RENOVATE_AUTODISCOVER_REPO_SORT
*/
function massageConvertedExperimentalVars(env) {
	const result = { ...env };
	for (const [oldKey, { optionName, normalizeValue }] of convertedExperimentalEnvVars) if (env[oldKey] !== void 0) {
		const newKey = getEnvName({ name: optionName });
		result[newKey] = normalizeValue ? normalizeValue(env[oldKey]) : env[oldKey];
		delete result[oldKey];
	}
	return result;
}
async function getConfig(inputEnv, configEnvKey = "RENOVATE_CONFIG") {
	const env = prepareEnv(inputEnv);
	const config = await parseAndValidateOrExit(env, configEnvKey);
	const options = getOptions();
	config.hostRules ??= [];
	for (const option of options) {
		if (option.env === false) continue;
		const envName = getEnvName(option);
		const envVal = env[envName];
		if (!envVal) continue;
		if (option.type === "array" && option.subType === "object") try {
			const parsed = JSON5.parse(envVal);
			if (isArray(parsed)) config[option.name] = parsed;
			else logger.debug({
				val: envVal,
				envName
			}, "Could not parse object array");
		} catch {
			logger.debug({
				val: envVal,
				envName
			}, "Could not parse environment variable");
		}
		else {
			const coerce = coersions[option.type];
			try {
				config[option.name] = coerce(envVal);
			} catch (e) {
				throw new Error(`${envName} was invalid: ${e}`);
			}
			if (option.name === "dryRun") {
				if (config[option.name] === "true") {
					logger.warn("env config dryRun property has been changed to full");
					config[option.name] = "full";
				} else if (config[option.name] === "false") {
					logger.warn("env config dryRun property has been changed to null");
					delete config[option.name];
				} else if (config[option.name] === "null") delete config[option.name];
			}
			if (option.name === "requireConfig") {
				if (config[option.name] === "true") {
					logger.warn("env config requireConfig property has been changed to required");
					config[option.name] = "required";
				} else if (config[option.name] === "false") {
					logger.warn("env config requireConfig property has been changed to optional");
					config[option.name] = "optional";
				}
			}
			if (option.name === "platformCommit") {
				if (config[option.name] === "true") {
					logger.warn("env config platformCommit property has been changed to enabled");
					config[option.name] = "enabled";
				} else if (config[option.name] === "false") {
					logger.warn("env config platformCommit property has been changed to disabled");
					config[option.name] = "disabled";
				}
			}
		}
	}
	const githubComToken = env.GITHUB_COM_TOKEN ?? env.RENOVATE_GITHUB_COM_TOKEN;
	if (githubComToken) {
		logger.debug(`Converting GITHUB_COM_TOKEN into a global host rule`);
		config.hostRules.push({
			hostType: "github",
			matchHost: "github.com",
			token: githubComToken
		});
	}
	for (const val of [
		"BITBUCKET_TOKEN",
		"BITBUCKET_USERNAME",
		"BITBUCKET_PASSWORD",
		"GITHUB_ENDPOINT",
		"GITHUB_TOKEN",
		"GITLAB_ENDPOINT",
		"GITLAB_TOKEN",
		"VSTS_ENDPOINT",
		"VSTS_TOKEN"
	]) delete env[val];
	return config;
}
function prepareEnv(inputEnv) {
	let env = normalizePrefixes(inputEnv, inputEnv.ENV_PREFIX);
	env = massageConvertedExperimentalVars(env);
	env = renameEnvKeys(env);
	return massageEnvKeyValues(env);
}
async function parseAndValidateOrExit(env, configEnvKey) {
	if (!env[configEnvKey]) return {};
	try {
		const config = parseJson(env[configEnvKey], `${configEnvKey}.env.json5`);
		logger.debug({ config }, `Detected config in env ${configEnvKey}`);
		return await migrateAndValidateConfig(config, `${configEnvKey}`);
	} catch (err) {
		logger.fatal({
			err,
			configEnvKey
		}, "Could not parse config environment variable");
		process.exit(1);
	}
}
//#endregion
export { convertedExperimentalEnvVars, getConfig, parseAndValidateOrExit, prepareEnv };

//# sourceMappingURL=env.js.map