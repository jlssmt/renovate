import { CONFIG_PRESETS_INVALID } from "../../constants/error-messages.js";
import { pkg } from "../../expose.js";
import { getEnv } from "../../util/env.js";
import { regexEngineStatus } from "../../util/regex.js";
import { GlobalConfig } from "../../config/global.js";
import { setGlobalLogLevelRemaps } from "../../logger/remap.js";
import { coerceString } from "../../util/string.js";
import { addSecretForSanitizing } from "../../util/sanitize.js";
import { getProblems, logLevel, logger, setMeta } from "../../logger/index.js";
import { instrument } from "../../instrumentation/index.js";
import { add, clear, filterAllowedHeaders } from "../../util/host-rules.js";
import { resolveConfigPresets } from "../../config/presets/index.js";
import { validateConfigSecretsAndVariables } from "../../config/secrets.js";
import { parseConfigs } from "./config/parse/index.js";
import { clear as clear$1 } from "../../util/http/queue.js";
import { clear as clear$2 } from "../../util/http/throttle.js";
import { isLimitReached } from "./limits.js";
import { autodiscoverRepositories } from "./autodiscover.js";
import { filterConfig } from "../../config/index.js";
import { exportStats, finalizeReport } from "../../instrumentation/reporting.js";
import { renovateRepository } from "../repository/index.js";
import { globalFinalize, globalInitialize } from "./initialize.js";
import { isNonEmptyObject, isNonEmptyString, isNonEmptyStringAndNotWhitespace, isString } from "@sindresorhus/is";
import fs from "fs-extra";
import upath from "upath";
import semver from "semver";
import { ATTR_VCS_OWNER_NAME, ATTR_VCS_PROVIDER_NAME, ATTR_VCS_REPOSITORY_NAME } from "@opentelemetry/semantic-conventions/incubating";
import { ERROR } from "bunyan";
//#region lib/workers/global/index.ts
function applyGlobalOption(target, source, key) {
	target[key] = source[key];
	delete source[key];
}
async function getRepositoryConfig(globalConfig, repository) {
	const repoIsString = isString(repository);
	const repoName = repoIsString ? repository : repository.repository;
	const repoConfig = {
		...globalConfig,
		repository: repoName
	};
	if (!repoIsString) {
		const { repository: _repository, ...repositoryEntryConfig } = repository;
		for (const option of GlobalConfig.OPTIONS) if (option in repositoryEntryConfig) applyGlobalOption(repoConfig, repositoryEntryConfig, option);
		if (isNonEmptyObject(repositoryEntryConfig)) repoConfig.repositoryEntryConfig = repositoryEntryConfig;
	}
	const repoParts = repoName.split("/");
	repoParts.pop();
	repoConfig.parentOrg = repoParts.join("/");
	repoConfig.topLevelOrg = repoParts.shift();
	const platform = GlobalConfig.get("platform");
	repoConfig.localDir = platform === "local" ? process.cwd() : upath.join(repoConfig.baseDir, `./repos/${platform}/${repoName}`);
	await fs.ensureDir(repoConfig.localDir);
	delete repoConfig.baseDir;
	return filterConfig(repoConfig, "repository");
}
function getGlobalConfig() {
	return parseConfigs(getEnv(), process.argv);
}
function haveReachedLimits() {
	if (isLimitReached("Commits")) {
		logger.info("Max commits created for this run.");
		return true;
	}
	return false;
}
/* istanbul ignore next */
function checkEnv() {
	const range = pkg.engines.node;
	if (process.release?.name !== "node" || !process.versions?.node) logger.warn({
		release: process.release,
		versions: process.versions
	}, "Unknown node environment detected.");
	else if (!semver.satisfies(process.versions?.node, range)) logger.error({
		versions: process.versions,
		range
	}, "Unsupported node environment detected. Please update your node version.");
}
async function validatePresets(config) {
	logger.debug("validatePresets()");
	try {
		await resolveConfigPresets(config);
	} catch (err) /* istanbul ignore next */ {
		logger.error({ err }, CONFIG_PRESETS_INVALID);
		throw new Error(CONFIG_PRESETS_INVALID);
	}
}
async function start() {
	logger.info({ renovateVersion: pkg.version }, "Renovate started");
	// istanbul ignore next
	if (regexEngineStatus.type === "available") logger.debug("Using RE2 regex engine");
	else if (regexEngineStatus.type === "unavailable") logger.warn({ err: regexEngineStatus.err }, "RE2 not usable, falling back to RegExp");
	else if (regexEngineStatus.type === "ignored") logger.debug("RE2 regex engine is ignored via RENOVATE_X_IGNORE_RE2");
	let config;
	let repoExitCode = 0;
	const env = getEnv();
	try {
		if (isNonEmptyStringAndNotWhitespace(env.AWS_SECRET_ACCESS_KEY)) addSecretForSanitizing(env.AWS_SECRET_ACCESS_KEY, "global");
		if (isNonEmptyStringAndNotWhitespace(env.AWS_SESSION_TOKEN)) addSecretForSanitizing(env.AWS_SESSION_TOKEN, "global");
		if (isNonEmptyStringAndNotWhitespace(env.COREPACK_NPM_TOKEN)) addSecretForSanitizing(env.COREPACK_NPM_TOKEN, "global");
		if (isNonEmptyStringAndNotWhitespace(env.COREPACK_NPM_PASSWORD)) addSecretForSanitizing(env.COREPACK_NPM_PASSWORD, "global");
		await instrument("config", async () => {
			config = await getGlobalConfig();
			GlobalConfig.set({
				allowedHeaders: config.allowedHeaders,
				userAgent: config.userAgent
			});
			config = await globalInitialize(config);
			GlobalConfig.set({
				allowedHeaders: config.allowedHeaders,
				platform: config.platform,
				endpoint: config.endpoint,
				userAgent: config.userAgent
			});
			await validatePresets(config);
			setGlobalLogLevelRemaps(config.logLevelRemap);
			checkEnv();
			validateConfigSecretsAndVariables(config);
		});
		config = await instrument("discover", () => autodiscoverRepositories(config));
		if (isNonEmptyString(config.writeDiscoveredRepos)) {
			const content = JSON.stringify(config.repositories);
			await fs.writeFile(config.writeDiscoveredRepos, content);
			logger.info(`Written discovered repositories to ${config.writeDiscoveredRepos}`);
			return 0;
		}
		let filteredGlobalHostRules;
		for (const repository of config.repositories) {
			if (haveReachedLimits()) break;
			const { owner, repo } = repositoryToOwnerAndRepo(isString(repository) ? repository : repository.repository);
			await instrument("repository", async () => {
				const repoConfig = await getRepositoryConfig(config, repository);
				if (repoConfig.hostRules) {
					logger.debug("Reinitializing hostRules for repo");
					clear();
					const rules = repoConfig.hostRules === config.hostRules && repoConfig.allowedHeaders === config.allowedHeaders ? filteredGlobalHostRules ??= filterAllowedHeaders(repoConfig.hostRules, config.allowedHeaders, false) : filterAllowedHeaders(repoConfig.hostRules, repoConfig.allowedHeaders);
					for (const rule of rules) add(rule, {
						allowedHeaders: repoConfig.allowedHeaders,
						trusted: true
					});
					repoConfig.hostRules = [];
				}
				clear$1();
				clear$2();
				const repoResult = await renovateRepository(repoConfig);
				if (config.exitCodeForErrors && !repoExitCode) repoExitCode = repoResult?.exitCode ?? 0;
				setMeta({});
			}, { attributes: {
				[ATTR_VCS_PROVIDER_NAME]: config.platform,
				[ATTR_VCS_OWNER_NAME]: owner,
				[ATTR_VCS_REPOSITORY_NAME]: repo,
				/** @deprecated TODO remove */
				repository: isString(repository) ? repository : repository.repository
			} });
		}
		finalizeReport();
		await exportStats(config);
	} catch (err) /* istanbul ignore next */ {
		if (err.message.startsWith("Init: ")) logger.fatal({ errorMessage: err.message.substring(6) }, "Initialization error");
		else logger.fatal({ err }, "Unknown error");
		if (!config) {
			logger.debug(`Missing config`);
			return 2;
		}
	} finally {
		await globalFinalize(config);
		if (logLevel() === "info") logger.info(`Renovate was run at log level "${logLevel()}". Set LOG_LEVEL=debug in environment variables to see extended debug logs.`);
	}
	if (repoExitCode) {
		logger.info({ exitCode: repoExitCode }, "Renovate is exiting with an error-specific code due to a repository error");
		return repoExitCode;
	}
	const loggerErrors = getProblems().filter((p) => p.level >= ERROR);
	if (loggerErrors.length) {
		logger.info({ loggerErrors }, "Renovate is exiting with a non-zero code due to the following logged errors");
		return 1;
	}
	return 0;
}
function repositoryToOwnerAndRepo(fullName) {
	const parts = fullName.split("/");
	const repo = coerceString(parts.pop());
	return {
		owner: parts.join("/"),
		repo
	};
}
//#endregion
export { getRepositoryConfig, start, validatePresets };

//# sourceMappingURL=index.js.map