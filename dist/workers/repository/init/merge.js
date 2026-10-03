import { CONFIG_VALIDATION, REPOSITORY_CHANGED } from "../../../constants/error-messages.js";
import { pkg } from "../../../expose.js";
import { coerceObject } from "../../../util/object.js";
import { setUserEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { getConfigFileNames } from "../../../config/app-strings.js";
import { coerceArray } from "../../../util/array.js";
import { coerceString } from "../../../util/string.js";
import { safeStringify } from "../../../util/stringify.js";
import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { massageConfig } from "../../../config/massage.js";
import { parseUrl } from "../../../util/url.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { migrateConfig } from "../../../config/migration.js";
import { add, matchesHost } from "../../../util/host-rules.js";
import { getInheritedOrGlobal, parseJson } from "../../../util/common.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { resolveConfigPresets } from "../../../config/presets/index.js";
import { ConfigValidationTopic } from "../../../config/validation-helpers/types.js";
import { validateConfig } from "../../../config/validation.js";
import { readLocalFile, readSystemFile } from "../../../util/fs/index.js";
import { decryptConfig } from "../../../config/decrypt.js";
import { applySecretsAndVariablesToConfig } from "../../../config/secrets.js";
import { clear } from "../../../util/http/queue.js";
import { clear as clear$1 } from "../../../util/http/throttle.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { maskToken } from "../../../util/mask.js";
import { setNpmrc } from "../../../modules/datasource/npm/npmrc.js";
import "../../../modules/datasource/npm/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import "../../../config/index.js";
import { migrateAndValidate } from "../../../config/migrate-validate.js";
import { parseFileConfig } from "../../../config/parse.js";
import { getOnboardingConfig } from "../onboarding/branch/config.js";
import { getOnboardingConfigFromCache, getOnboardingFileNameFromCache, setOnboardingConfigDetails } from "../onboarding/branch/onboarding-branch-cache.js";
import { OnboardingState, getDefaultConfigFileName } from "../onboarding/common.js";
import { filterAllowedEnv } from "./filter-allowed-env.js";
import { isNonEmptyArray, isNonEmptyObject, isNonEmptyString, isString, isUndefined } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/workers/repository/init/merge.ts
async function detectConfigFile() {
	const fileList = await scm.getFileList();
	for (const fileName of getConfigFileNames()) if (fileName === "package.json") try {
		if (JSON.parse(await readLocalFile("package.json", "utf8")).renovate) {
			logger.warn("Using package.json for Renovate config is deprecated - please use a dedicated configuration file instead");
			return "package.json";
		}
	} catch {}
	else if (fileList.includes(fileName)) return fileName;
	return null;
}
async function detectRepoFileConfig(branchName) {
	const cache = getCache();
	let { configFileName } = cache;
	if (isNonEmptyString(configFileName)) {
		let configFileRaw;
		try {
			configFileRaw = await platform.getRawFile(configFileName, void 0, branchName);
		} catch (err) {
			// istanbul ignore if
			if (err instanceof ExternalHostError) throw err;
			configFileRaw = null;
		}
		if (configFileRaw) {
			let configFileParsed = parseJson(configFileRaw, configFileName);
			if (configFileName === "package.json") configFileParsed = configFileParsed.renovate;
			return {
				configFileName,
				configFileParsed
			};
		}
		logger.debug("Existing config file no longer exists");
		delete cache.configFileName;
	}
	if (OnboardingState.onboardingCacheValid) configFileName = getOnboardingFileNameFromCache();
	else configFileName = coerceString(await detectConfigFile());
	if (!configFileName) {
		logger.debug("No renovate config file found");
		cache.configFileName = "";
		return {};
	}
	cache.configFileName = configFileName;
	logger.debug(`Found ${configFileName} config file`);
	let configFileParsed;
	let configFileRaw;
	if (OnboardingState.onboardingCacheValid) {
		const cachedConfig = getOnboardingConfigFromCache();
		const parsedConfig = cachedConfig ? JSON.parse(cachedConfig) : void 0;
		if (parsedConfig) {
			setOnboardingConfigDetails(configFileName, JSON.stringify(parsedConfig));
			return {
				configFileName,
				configFileParsed: parsedConfig
			};
		}
	}
	if (configFileName === "package.json") {
		configFileParsed = JSON.parse(await readLocalFile("package.json", "utf8")).renovate;
		if (isString(configFileParsed)) {
			logger.debug("Massaging string renovate config to extends array");
			configFileParsed = { extends: [configFileParsed] };
		}
		logger.debug({ config: configFileParsed }, "package.json>renovate config");
	} else {
		configFileRaw = await readLocalFile(configFileName, "utf8");
		// istanbul ignore if
		if (!isString(configFileRaw)) {
			logger.warn({ configFileName }, "Null contents when reading config file");
			throw new Error(REPOSITORY_CHANGED);
		}
		// istanbul ignore if
		if (!configFileRaw.length) configFileRaw = "{}";
		const parseResult = parseFileConfig(configFileName, configFileRaw);
		if (!parseResult.success) return {
			configFileName,
			configFileParseError: {
				validationError: parseResult.validationError,
				validationMessage: parseResult.validationMessage
			}
		};
		configFileParsed = parseResult.parsedContents;
		logger.debug({
			fileName: configFileName,
			config: configFileParsed
		}, "Repository config");
	}
	setOnboardingConfigDetails(configFileName, JSON.stringify(configFileParsed));
	return {
		configFileName,
		configFileParsed
	};
}
function checkForRepoConfigError(repoConfig) {
	if (!repoConfig.configFileParseError) return;
	const error = new Error(CONFIG_VALIDATION);
	error.validationSource = repoConfig.configFileName;
	error.validationError = repoConfig.configFileParseError.validationError;
	error.validationMessage = repoConfig.configFileParseError.validationMessage;
	throw error;
}
/**
* Validation source for `repositories[]` object-entry config.
*
* As these are managed by the self-hosted admin's global config (`config.js`, or through environment variables, CLI options) we shouldn't report this as an issue the repo owner has introduced.
*/
const repositoriesEntrySource = "Self-hosted config (`repositories[]`)";
const repoFileValidationError = "The Renovate configuration file contains some invalid settings";
const repositoriesEntryValidationError = "The self-hosted `repositories[]` config contains some invalid settings";
function throwConfigValidationError(validationSource, errors, validationError = repoFileValidationError) {
	const error = new Error(CONFIG_VALIDATION);
	error.validationSource = validationSource;
	error.validationError = validationError;
	error.validationMessage = errors.map((e) => e.message).join(", ");
	throw error;
}
/**
* Validate a fully-resolved config (i.e. after `resolveConfigPresets`).
*
* If there are top-level `allowedEnv`/`allowedHeaders` violations, these are reported with `ConfigValidationTopic.Security` and always fail a validation, as they are sensitive config options that need to be blocked.
*
* All other issues will be a WARN, unless `configValidationError=true`, because these are resolved config options and may not be in control of the repository owner.
*
* `validationSource` is reported to the user; use `repositoriesEntrySource` and `repositoriesEntryValidationError` for admin-controlled object entries so a fault is not blamed on the repo owner.
*/
async function validateResolvedConfig(resolved, validationSource, strict, validationError) {
	const { errors, warnings } = await validateConfig("repo", massageConfig(resolved));
	const securityErrors = [...errors, ...warnings].filter((err) => err.topic === ConfigValidationTopic.Security);
	const otherErrors = errors.filter((err) => err.topic !== ConfigValidationTopic.Security);
	const otherWarnings = warnings.filter((err) => err.topic !== ConfigValidationTopic.Security);
	if (otherErrors.length || otherWarnings.length) logger.debug({
		errors: otherErrors,
		warnings: otherWarnings
	}, "Config validation failed on resolved config, for non-security-sensitive reasons");
	if (securityErrors.length) throwConfigValidationError(validationSource, securityErrors, validationError);
	if (strict && otherErrors.length) throwConfigValidationError(validationSource, otherErrors, validationError);
}
/**
* Identify a single `env` variable, or a single header of a host rule, by name and value.
*
* As `env` is replaced wholesale and `hostRules` is `mergeable`, self-hosted config and repo config end up indistinguishable in the resolved config, so we need a stable way to look a given name and value up.
*/
function nameValueIdentity(name, value) {
	return safeStringify([name, value]);
}
/**
* Index a set of host rules' headers by {@link nameValueIdentity}, recording the `matchHost` values each is set for (`null` for a host-less rule, which matches every host).
*/
function headersByIdentity(rules) {
	const result = /* @__PURE__ */ new Map();
	for (const rule of coerceArray(rules)) for (const [name, value] of Object.entries(coerceObject(rule.headers))) {
		const identity = nameValueIdentity(name, value);
		const hosts = result.get(identity) ?? /* @__PURE__ */ new Set();
		hosts.add(rule.matchHost ?? null);
		result.set(identity, hosts);
	}
	return result;
}
/**
* Whether every request matched by `matchHost` is also matched by `adminMatchHost` - i.e. a rule scoped to `matchHost` cannot reach any host the admin's own rule does not already reach.
*
* A bare hostname is compared as its `https://` URL. `matchesHost` treats a bare `adminMatchHost` as also covering its subdomains, which errs on the admin-friendly side: those hosts sit within the admin's own domain.
*/
function isWithinHost(matchHost, adminMatchHost) {
	const url = parseUrl(matchHost) ? matchHost : `https://${matchHost}`;
	return matchesHost(url, adminMatchHost);
}
/**
* Migrate a config, tolerating a migration which throws.
*
* `hostRules` migration throws when a rule carries more than one host-matching field. That is per-rule invalid config which {@link applyHostRules} logs and skips over, keeping the rest of the run going, so migrating a whole config here must not escalate it into an error which aborts the repository.
*/
function migrateConfigOrWarn(config) {
	try {
		return migrateConfig(config);
	} catch (err) {
		logger.warn({ err }, "Error migrating config");
		return {
			isMigrated: false,
			migratedConfig: config
		};
	}
}
/**
* Migrate a set of host rules, so that their `matchHost` compares like for like against the resolved config's own: migration rewrites them (e.g. a legacy `hostName` becoming a `matchHost`, or a bare `matchHost` gaining a scheme), and the resolved config only ever contains the migrated spellings.
*/
function migratedHostRules(rules) {
	if (!isNonEmptyArray(rules)) return [];
	return coerceArray(migrateConfigOrWarn({ hostRules: rules }).migratedConfig.hostRules);
}
/**
* Collect the {@link AdminSuppliedValues} of every config the self-hosted admin supplied.
*
* A preset is only ever resolved into the config which extends it, so a config here is the *resolved* form of an admin config: whatever the presets the admin chose to extend contribute is as much theirs as a value they wrote inline.
*/
function adminSuppliedValues(adminConfigs) {
	const env = /* @__PURE__ */ new Set();
	const headers = /* @__PURE__ */ new Map();
	const internalGrants = /* @__PURE__ */ new Map();
	for (const adminConfig of adminConfigs) for (const source of [adminConfig, adminConfig.force]) {
		for (const [name, value] of Object.entries(coerceObject(source?.env))) env.add(nameValueIdentity(name, value));
		const rules = migratedHostRules(source?.hostRules);
		for (const [identity, matchHosts] of headersByIdentity(rules)) {
			const hosts = headers.get(identity) ?? /* @__PURE__ */ new Set();
			for (const matchHost of matchHosts) hosts.add(matchHost);
			headers.set(identity, hosts);
		}
		for (const rule of rules) if (!isUndefined(rule.allowInternal)) {
			const key = rule.allowInternal.toString();
			const hosts = internalGrants.get(key) ?? /* @__PURE__ */ new Set();
			hosts.add(rule.matchHost ?? null);
			internalGrants.set(key, hosts);
		}
	}
	return {
		env,
		headers,
		internalGrants
	};
}
/**
* Return `resolved` without the security-sensitive (`env` and `hostRules[].headers`) values the self-hosted admin supplied themselves.
*
* `allowedEnv`/`allowedHeaders` exist to constrain what repository config, and the presets it extends, may inject; the self-hosted admin is who sets those allowlists, so their own values are not violations of them.
*
* Reporting them would abort the repository and file a "Fix Renovate Configuration" issue whose cause the repository's owners can neither see nor fix.
*/
function withoutAdminSuppliedValues(resolved, admin) {
	const result = { ...resolved };
	if (result.env) result.env = Object.fromEntries(Object.entries(result.env).filter(([name, value]) => !admin.env.has(nameValueIdentity(name, value))));
	if (result.hostRules) result.hostRules = result.hostRules.map((rule) => {
		const filtered = {
			...rule,
			headers: Object.fromEntries(Object.entries(coerceObject(rule.headers)).filter(([name, value]) => {
				const adminHosts = admin.headers.get(nameValueIdentity(name, value));
				if (!adminHosts) return true;
				if (adminHosts.has(null)) return false;
				return !(rule.matchHost && [...adminHosts].some((adminHost) => adminHost !== null && isWithinHost(rule.matchHost, adminHost)));
			}))
		};
		if (!isUndefined(filtered.allowInternal)) {
			const adminHosts = admin.internalGrants.get(filtered.allowInternal.toString());
			if (adminHosts && (adminHosts.has(null) || !!filtered.matchHost && [...adminHosts].some((adminHost) => adminHost !== null && isWithinHost(filtered.matchHost, adminHost)))) delete filtered.allowInternal;
		}
		return filtered;
	});
	if (result.force) result.force = withoutAdminSuppliedValues(result.force, admin);
	return result;
}
async function mergeRenovateConfig(config, branchName) {
	let returnConfig = { ...config };
	let repoConfig = {};
	if (getInheritedOrGlobal("requireConfig") !== "ignored") repoConfig = await detectRepoFileConfig(branchName);
	if (!repoConfig.configFileParsed && config.mode === "silent") {
		logger.debug("When mode=silent and repo has no config file, we use the onboarding config as repo config");
		repoConfig = {
			configFileName: getDefaultConfigFileName(),
			configFileParsed: await getOnboardingConfig(config)
		};
	}
	const resolvedRepoConfig = await resolveStaticRepoConfig(coerceObject(repoConfig?.configFileParsed), process.env.RENOVATE_X_STATIC_REPO_CONFIG_FILE);
	const repoEntryConfig = returnConfig.repositoryEntryConfig;
	delete returnConfig.repositoryEntryConfig;
	let adminPresetConfig = {};
	if (isNonEmptyArray(returnConfig.extends)) try {
		({config: adminPresetConfig} = await resolveConfigPresets({ extends: returnConfig.extends }, config, config.ignorePresets));
	} catch (err) {
		logger.debug({ err }, "Error resolving the self-hosted config presets - continuing without their exemption");
	}
	const adminSuppliedEnv = {
		...coerceObject(adminPresetConfig.env),
		...coerceObject(adminPresetConfig.force?.env),
		...coerceObject(config.env),
		...coerceObject(config.force?.env),
		...coerceObject(repoEntryConfig?.env),
		...coerceObject(repoEntryConfig?.force?.env)
	};
	const adminConfigs = [config, adminPresetConfig];
	if (isNonEmptyObject(repoEntryConfig)) {
		const repoEntry = repoEntryConfig;
		const toResolve = {
			...repoEntry,
			extends: [...coerceArray(returnConfig.extends), ...coerceArray(repoEntry.extends)],
			ignorePresets: [
				...coerceArray(returnConfig.ignorePresets),
				...coerceArray(repoEntry.ignorePresets),
				...coerceArray(resolvedRepoConfig.ignorePresets)
			]
		};
		delete returnConfig.extends;
		let { config: resolvedRepoEntry } = await resolveConfigPresets(toResolve, config);
		const entryMigration = migrateConfigOrWarn(resolvedRepoEntry);
		if (entryMigration.isMigrated) resolvedRepoEntry = entryMigration.migratedConfig;
		const { migratedConfig: migratedEntry } = migrateConfigOrWarn(toResolve);
		delete migratedEntry.extends;
		delete migratedEntry.ignorePresets;
		adminConfigs.push(resolvedRepoEntry);
		if (!dequal(resolvedRepoEntry, migratedEntry)) await validateResolvedConfig(withoutAdminSuppliedValues(resolvedRepoEntry, adminSuppliedValues(adminConfigs)), repositoriesEntrySource, config.configValidationError === true, repositoriesEntryValidationError);
		applyNpmrc(resolvedRepoEntry, "resolvedRepoEntry");
		const resolvedRepoEntryWithSecrets = applySecretsAndVariablesToConfig({
			config: resolvedRepoEntry,
			secrets: mergeChildConfig(coerceObject(config.secrets), coerceObject(resolvedRepoEntry.secrets)),
			variables: mergeChildConfig(coerceObject(config.variables), coerceObject(resolvedRepoEntry.variables))
		});
		Object.assign(adminSuppliedEnv, coerceObject(resolvedRepoEntryWithSecrets.env), coerceObject(resolvedRepoEntryWithSecrets.force?.env));
		applyHostRules(resolvedRepoEntryWithSecrets, { trusted: true });
		returnConfig = mergeChildConfig(returnConfig, resolvedRepoEntryWithSecrets);
	}
	if (isNonEmptyArray(returnConfig.extends)) {
		resolvedRepoConfig.extends = [...coerceArray(returnConfig.extends), ...coerceArray(resolvedRepoConfig.extends)];
		delete returnConfig.extends;
	}
	checkForRepoConfigError(repoConfig);
	const migratedConfig = await migrateAndValidate(config, resolvedRepoConfig);
	if (migratedConfig.errors?.length) throwConfigValidationError(repoConfig.configFileName, migratedConfig.errors);
	// v8 ignore else -- migration always leaves a warnings array behind
	if (migratedConfig.warnings) returnConfig.warnings = [...coerceArray(returnConfig.warnings), ...migratedConfig.warnings];
	delete migratedConfig.errors;
	delete migratedConfig.warnings;
	const repository = config.repository;
	const decryptedConfig = await decryptConfig(migratedConfig, repository);
	applyNpmrc(decryptedConfig, "decrypted");
	await logShallowConfig(decryptedConfig, config);
	const { config: configToDecrypt } = await resolveConfigPresets(decryptedConfig, config, config.ignorePresets);
	let resolvedConfig = await decryptConfig(configToDecrypt, repository);
	logger.trace({ config: resolvedConfig }, "resolved config");
	const migrationResult = migrateConfig(resolvedConfig);
	if (migrationResult.isMigrated) {
		logger.debug("Resolved config needs migrating");
		logger.trace({ config: resolvedConfig }, "resolved config after migrating");
		resolvedConfig = migrationResult.migratedConfig;
	}
	if (!dequal(resolvedConfig, migratedConfig)) await validateResolvedConfig(withoutAdminSuppliedValues(resolvedConfig, adminSuppliedValues(adminConfigs)), repoConfig.configFileName ?? "config", config.configValidationError === true);
	if (isString(resolvedConfig.npmrc)) logger.debug("Ignoring any .npmrc files in repository due to configured npmrc");
	applyNpmrc(resolvedConfig, "resolved");
	resolvedConfig = applySecretsAndVariablesToConfig({
		config: resolvedConfig,
		secrets: mergeChildConfig(coerceObject(config.secrets), coerceObject(resolvedConfig.secrets)),
		variables: mergeChildConfig(coerceObject(config.variables), coerceObject(resolvedConfig.variables))
	});
	applyHostRules(resolvedConfig);
	returnConfig = mergeChildConfig(returnConfig, resolvedConfig);
	({config: returnConfig} = await resolveConfigPresets(returnConfig, config));
	returnConfig.renovateJsonPresent = true;
	// istanbul ignore if
	if (returnConfig.ignorePaths?.length) logger.debug({ ignorePaths: returnConfig.ignorePaths }, `Found repo ignorePaths`);
	setUserEnv(filterAllowedEnv(returnConfig.env, adminSuppliedEnv));
	delete returnConfig.env;
	return returnConfig;
}
function applyNpmrc(config, configType) {
	setNpmTokenInNpmrc(config);
	if (!isString(config.npmrc)) return;
	logger.debug(`Setting npmrc from ${configType ? `${configType} ` : ""}config`);
	setNpmrc(config.npmrc);
}
function applyHostRules(config, options) {
	if (!config.hostRules) return;
	logger.debug("Setting hostRules from config");
	for (const rule of config.hostRules) try {
		add(rule, options);
	} catch (err) {
		logger.warn({
			err,
			config: rule
		}, "Error setting hostRule from config");
	}
	clear();
	clear$1();
	delete config.hostRules;
}
/** needed when using portal secrets for npmToken */
function setNpmTokenInNpmrc(config) {
	if (!isString(config.npmToken)) return;
	const token = config.npmToken;
	logger.debug({ npmToken: maskToken(token) }, "Migrating npmToken to npmrc");
	if (!isString(config.npmrc)) {
		logger.debug("Adding npmrc to config");
		config.npmrc = `//registry.npmjs.org/:_authToken=${token}\n`;
		delete config.npmToken;
		return;
	}
	if (config.npmrc.includes(`\${NPM_TOKEN}`)) {
		logger.debug(`Replacing \${NPM_TOKEN} with npmToken`);
		config.npmrc = config.npmrc.replace(regEx(/\${NPM_TOKEN}/g), token);
	} else {
		logger.debug("Appending _authToken= to end of existing npmrc");
		config.npmrc = config.npmrc.replace(regEx(/\n?$/), `\n_authToken=${token}\n`);
	}
	delete config.npmToken;
}
async function resolveStaticRepoConfig(config, filename) {
	if (!isNonEmptyString(filename)) return config;
	let staticRepoConfig;
	try {
		staticRepoConfig = await tryReadStaticRepoFileConfig(filename);
	} catch (err) {
		logger.fatal({ err }, "Failed to load static repository config file");
		process.exit(1);
	}
	if (!isNonEmptyObject(staticRepoConfig)) return config;
	return mergeStaticConfig(config, staticRepoConfig);
}
async function tryReadStaticRepoFileConfig(staticRepoConfigFile) {
	logger.debug(`Reading static repo config file from ${staticRepoConfigFile}`);
	let staticRepoConfigRaw;
	try {
		staticRepoConfigRaw = await readSystemFile(staticRepoConfigFile, "utf8");
	} catch (err) {
		throw new Error(`Failed to read static repo config file: "${staticRepoConfigFile}"`, { cause: err });
	}
	const staticRepoConfig = parseJson(staticRepoConfigRaw, staticRepoConfigFile);
	const { errors, warnings } = await validateConfig("repo", staticRepoConfig);
	if (isNonEmptyArray(errors) || isNonEmptyArray(warnings)) logger.info({
		errors,
		warnings
	}, "Static repo config validation issues detected");
	else logger.debug({ staticRepoConfig }, "Static repository config file successfully parsed and validated");
	return staticRepoConfig;
}
function mergeStaticConfig(config, staticRepoConfig) {
	if (isNonEmptyArray(staticRepoConfig.extends)) {
		config.extends = [...staticRepoConfig.extends, ...coerceArray(config.extends)];
		delete staticRepoConfig.extends;
	}
	return mergeChildConfig(staticRepoConfig, config);
}
/**
* Resolve everything but internal Renovate presets and log it out.
*
* This allows users to understand the fully resolved configuration, including any `github>`, `local>`, etc presets, but excluding anything that's internal to Renovate (which can be verbose and/or less relevant), and provides useful output for debugging purposes.

* This is also known as the "shallow" config.

* Due to caching, this doesn't add any additional requests.
*/
async function logShallowConfig(_decryptedConfig, _config) {
	const decryptedConfig = clone(_decryptedConfig);
	const config = clone(_config);
	const { config: resolvedConfig, visitedPresets } = await resolveConfigPresets(clone(decryptedConfig), clone(config), [], [], false);
	logger.debug({
		renovateVersion: pkg.version,
		config: resolvedConfig,
		visitedPresets
	}, "Resolved shallow config, without merging internal presets");
}
//#endregion
export { applyHostRules, applyNpmrc, checkForRepoConfigError, detectConfigFile, detectRepoFileConfig, mergeRenovateConfig, mergeStaticConfig, resolveStaticRepoConfig, setNpmTokenInNpmrc, tryReadStaticRepoFileConfig };

//# sourceMappingURL=merge.js.map