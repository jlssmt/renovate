import { CONFIG_INHERIT_NOT_FOUND, CONFIG_INHERIT_PARSE_ERROR, CONFIG_VALIDATION } from "../../../constants/error-messages.js";
import { coerceObject } from "../../../util/object.js";
import { setUserConfigFileNames } from "../../../config/app-strings.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { InheritConfig } from "../../../config/inherit.js";
import { compile } from "../../../util/template/index.js";
import { resolveConfigPresets } from "../../../config/presets/index.js";
import { validateConfig } from "../../../config/validation.js";
import { decryptConfig } from "../../../config/decrypt.js";
import { applySecretsAndVariablesToConfig } from "../../../config/secrets.js";
import { platform } from "../../../modules/platform/index.js";
import { removeGlobalConfig } from "../../../config/index.js";
import { parseFileConfig } from "../../../config/parse.js";
import { applyHostRules } from "./merge.js";
import { isNonEmptyArray, isNullOrUndefined, isString } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/workers/repository/init/inherited.ts
const inheritedConfigValidationError = "The inherited config contains some invalid settings";
/**
* Report an inherited config validation failure against the inherited config, rather than the repository being processed.
*
* The inherited config repository is managed by the organization's administrators, so a fault there is not one the repository's owners have introduced - and they may not even be able to read the file to see it.
*/
function throwInheritedConfigValidationError(validationSource, errors) {
	const error = new Error(CONFIG_VALIDATION);
	error.validationSource = validationSource;
	error.validationError = inheritedConfigValidationError;
	error.validationMessage = errors.map((err) => err.message).join(", ");
	throw error;
}
/**
* How the inherited config's `hostRules` are registered.
*
* The inherited config repository is controlled by the organization's administrators rather than by the self-hosted administrator, so its rules are untrusted unless the administrator has opted into trusting them.
*/
function inheritedHostRuleOptions() {
	if (!GlobalConfig.get("inheritConfigTrusted")) return;
	return { inherited: true };
}
async function mergeInheritedConfig(config) {
	if (!config.repository || !config.inheritConfig) return config;
	if (!isString(config.inheritConfigRepoName) || !isString(config.inheritConfigFileName)) {
		logger.error({
			inheritConfigRepoName: config.inheritConfigRepoName,
			inheritConfigFileName: config.inheritConfigFileName
		}, "Invalid inherited config.");
		return config;
	}
	const templateConfig = {
		topLevelOrg: config.topLevelOrg,
		parentOrg: config.parentOrg,
		repository: config.repository
	};
	const inheritConfigRepoName = compile(config.inheritConfigRepoName, templateConfig, false);
	logger.trace({
		templateConfig,
		inheritConfigRepoName
	}, "Compiled inheritConfigRepoName result.");
	logger.debug(`Checking for inherited config file ${config.inheritConfigFileName} in repo ${inheritConfigRepoName}.`);
	let configFileRaw = null;
	try {
		configFileRaw = await platform.getRawFile(config.inheritConfigFileName, inheritConfigRepoName);
	} catch (err) {
		if (config.inheritConfigStrict) {
			logger.debug({ err }, "Error getting inherited config.");
			throw new Error(CONFIG_INHERIT_NOT_FOUND);
		}
		logger.trace({ err }, `Error getting inherited config.`);
	}
	if (!configFileRaw) {
		logger.debug(`No inherited config found in ${inheritConfigRepoName}.`);
		return config;
	}
	const parseResult = parseFileConfig(config.inheritConfigFileName, configFileRaw);
	if (!parseResult.success) {
		logger.debug({ parseResult }, "Error parsing inherited config.");
		throw new Error(CONFIG_INHERIT_PARSE_ERROR);
	}
	const inheritedConfigSource = `Inherited config (\`${config.inheritConfigFileName}\` in \`${inheritConfigRepoName}\`)`;
	const inheritedConfig = parseResult.parsedContents;
	logger.debug({ config: inheritedConfig }, `Inherited config`);
	const res = await validateConfig("inherit", inheritedConfig);
	if (res.errors.length) {
		logger.warn({ errors: res.errors }, "Found errors in inherited configuration.");
		throwInheritedConfigValidationError(inheritedConfigSource, res.errors);
	}
	if (res.warnings.length) logger.warn({ warnings: res.warnings }, "Found warnings in inherited configuration.");
	if (isNonEmptyArray(inheritedConfig.configFileNames)) {
		logger.debug({ configFileNames: inheritedConfig.configFileNames }, "Updated the config filenames list");
		setUserConfigFileNames(inheritedConfig.configFileNames);
		delete config.configFileNames;
	}
	let decryptedConfig = await decryptConfig(inheritedConfig, config.repository);
	let filteredConfig = removeGlobalConfig(decryptedConfig, true);
	if (!dequal(decryptedConfig, filteredConfig)) logger.debug({
		inheritedConfig: decryptedConfig,
		filteredConfig
	}, "Removed global config from inherited config.");
	if (isNullOrUndefined(filteredConfig.extends)) {
		filteredConfig = applySecretsAndVariablesToConfig({
			config: filteredConfig,
			secrets: coerceObject(config.secrets),
			variables: coerceObject(config.variables)
		});
		applyHostRules(filteredConfig, inheritedHostRuleOptions());
		filteredConfig = InheritConfig.set(filteredConfig);
		return mergeChildConfig(config, filteredConfig);
	}
	logger.debug("Resolving presets found in inherited config");
	const { config: resolvedConfig } = await resolveConfigPresets(filteredConfig, config, config.ignorePresets);
	logger.trace({ config: resolvedConfig }, "Resolved inherited config");
	const validationRes = await validateConfig("inherit", resolvedConfig);
	if (validationRes.errors.length) {
		logger.warn({ errors: validationRes.errors }, "Found errors in presets inside the inherited configuration.");
		throwInheritedConfigValidationError(inheritedConfigSource, validationRes.errors);
	}
	if (validationRes.warnings.length) logger.warn({ warnings: validationRes.warnings }, "Found warnings in presets inside the inherited configuration.");
	decryptedConfig = await decryptConfig(resolvedConfig, config.repository);
	filteredConfig = removeGlobalConfig(decryptedConfig, true);
	if (!dequal(decryptedConfig, filteredConfig)) logger.debug({
		inheritedConfig: decryptedConfig,
		filteredConfig
	}, "Removed global config from inherited config presets.");
	filteredConfig = applySecretsAndVariablesToConfig({
		config: filteredConfig,
		secrets: coerceObject(config.secrets),
		variables: coerceObject(config.variables)
	});
	applyHostRules(filteredConfig, inheritedHostRuleOptions());
	filteredConfig = InheritConfig.set(filteredConfig);
	return mergeChildConfig(config, filteredConfig);
}
//#endregion
export { mergeInheritedConfig };

//# sourceMappingURL=inherited.js.map