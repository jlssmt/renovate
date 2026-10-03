import { CONFIG_PRESETS_INVALID } from "../../../../constants/error-messages.js";
import { setCustomEnv } from "../../../../util/env.js";
import { setUserConfigFileNames } from "../../../../config/app-strings.js";
import { coerceArray } from "../../../../util/array.js";
import { addSecretForSanitizing } from "../../../../util/sanitize.js";
import { logger, setContext } from "../../../../logger/index.js";
import { ensureTrailingSlash } from "../../../../util/url.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import { resolveConfigPresets } from "../../../../config/presets/index.js";
import { readSystemFile } from "../../../../util/fs/index.js";
import { deleteNonDefaultConfig, getConfig } from "./file.js";
import { setPrivateKeys } from "../../../../config/decrypt.js";
import { getConfig as getConfig$1 } from "../../../../config/defaults.js";
import { applySecretsAndVariablesToConfig } from "../../../../config/secrets.js";
import { deleteNonDefaultConfig as deleteNonDefaultConfig$1, getConfig as getConfig$2 } from "./additional-config-file.js";
import { getConfig as getConfig$3 } from "./cli.js";
import { setConfig } from "./codespaces.js";
import { getConfig as getConfig$4 } from "./env.js";
import { isNonEmptyArray, isNonEmptyObject, isString } from "@sindresorhus/is";
//#region lib/workers/global/config/parse/index.ts
async function resolveGlobalExtends(globalExtends, ignorePresets) {
	try {
		const { config: resolvedConfig } = await resolveConfigPresets({
			extends: globalExtends,
			ignorePresets
		});
		return resolvedConfig;
	} catch (err) {
		logger.error({ err }, "Error resolving config preset");
		throw new Error(CONFIG_PRESETS_INVALID);
	}
}
async function parseConfigs(env, argv) {
	logger.debug("Parsing configs");
	const defaultConfig = getConfig$1();
	const fileConfig = await getConfig(env);
	const additionalFileConfig = await getConfig$2(env);
	const cliConfig = getConfig$3(argv);
	const envConfig = await getConfig$4(env);
	let config = mergeChildConfig(fileConfig, additionalFileConfig);
	if (isNonEmptyArray(fileConfig.extends) && isNonEmptyArray(additionalFileConfig.extends)) config.extends = [...fileConfig.extends, ...coerceArray(config.extends)];
	config = mergeChildConfig(config, envConfig);
	config = mergeChildConfig(config, cliConfig);
	config = await setConfig(config);
	let resolvedGlobalExtends;
	if (isNonEmptyArray(config?.globalExtends)) {
		resolvedGlobalExtends = await resolveGlobalExtends(config.globalExtends, config.ignorePresets);
		config = mergeChildConfig(resolvedGlobalExtends, config);
		delete config.globalExtends;
	}
	const combinedConfig = config;
	config = mergeChildConfig(defaultConfig, config);
	if (config.forceCli) {
		const forcedCli = { ...cliConfig };
		delete forcedCli.token;
		delete forcedCli.hostRules;
		if (config.force) config.force = {
			...config.force,
			...forcedCli
		};
		else config.force = forcedCli;
	}
	if (!config.privateKey && config.privateKeyPath) {
		config.privateKey = await readSystemFile(config.privateKeyPath, "utf8");
		delete config.privateKeyPath;
	}
	if (!config.privateKeyOld && config.privateKeyPathOld) {
		config.privateKeyOld = await readSystemFile(config.privateKeyPathOld, "utf8");
		delete config.privateKeyPathOld;
	}
	addSecretForSanitizing(config.privateKey, "global");
	addSecretForSanitizing(config.privateKeyOld, "global");
	setPrivateKeys(config.privateKey, config.privateKeyOld);
	delete config.privateKey;
	delete config.privateKeyOld;
	if (config.logContext) setContext(config.logContext);
	logger.trace({ config: defaultConfig }, "Default config");
	logger.debug({ config: fileConfig }, "File config");
	logger.debug({ config: additionalFileConfig }, "Additional file config");
	logger.debug({ config: cliConfig }, "CLI config");
	logger.debug({ config: envConfig }, "Env config");
	logger.debug({ config: resolvedGlobalExtends }, "Resolved global extends");
	logger.debug({ config: combinedConfig }, "Combined config");
	if (isNonEmptyArray(cliConfig.repositories)) {
		const existingRepos = [
			...coerceArray(fileConfig.repositories),
			...coerceArray(additionalFileConfig.repositories),
			...coerceArray(envConfig.repositories)
		];
		if (isNonEmptyArray(existingRepos)) {
			const allStrings = existingRepos.every((repo) => isString(repo));
			let shouldWarn = true;
			if (allStrings) {
				if (cliConfig.repositories.length === existingRepos.length && cliConfig.repositories.every((repo, idx) => repo === existingRepos[idx])) shouldWarn = false;
			}
			if (shouldWarn) logger.warn("CLI config is overridding the `repositories` config previously set");
		}
	}
	if (config.detectGlobalManagerConfig) {
		logger.debug("Detecting global manager config");
		const { detectAllGlobalConfig } = await import("../../../../modules/manager/index.js");
		const globalManagerConfig = await detectAllGlobalConfig();
		logger.debug({ config: globalManagerConfig }, "Global manager config");
		config = mergeChildConfig(config, globalManagerConfig);
	}
	if (config.detectHostRulesFromEnv) {
		const { hostRulesFromEnv } = await import("./host-rules-from-env.js");
		const hostRules = hostRulesFromEnv(env);
		config.hostRules = [...coerceArray(config.hostRules), ...hostRules];
	}
	logger.trace({ config }, "Full config");
	if (config.endpoint) {
		logger.debug("Adding trailing slash to endpoint");
		config.endpoint = ensureTrailingSlash(config.endpoint);
	}
	if (!config.autodiscover && config.forkProcessing !== "disabled") {
		logger.debug("Enabling forkProcessing while in non-autodiscover mode");
		config.forkProcessing = "enabled";
	}
	await deleteNonDefaultConfig(env, !!config.deleteConfigFile);
	await deleteNonDefaultConfig$1(env, !!config.deleteAdditionalConfigFile);
	if (!config.autodiscover && config.onboardingNoDeps !== "disabled") {
		logger.debug("Enabling onboardingNoDeps while in non-autodiscover mode");
		config.onboardingNoDeps = "enabled";
	}
	if (isNonEmptyObject(config.secrets) || isNonEmptyObject(config.variables)) {
		config = applySecretsAndVariablesToConfig({
			config,
			secrets: config.secrets,
			variables: config.variables,
			deleteSecrets: false,
			deleteVariables: false
		});
		for (const secret of Object.values(config.secrets)) addSecretForSanitizing(secret, "global");
	}
	if (isNonEmptyObject(config.customEnvVariables)) setCustomEnv(config.customEnvVariables);
	if (isNonEmptyArray(config.configFileNames)) {
		logger.debug({ configFileNames: config.configFileNames }, "Updated the config filenames list");
		setUserConfigFileNames(config.configFileNames);
		delete config.configFileNames;
	}
	return config;
}
//#endregion
export { parseConfigs, resolveGlobalExtends };

//# sourceMappingURL=index.js.map