import { REPOSITORY_DISABLED_BY_CONFIG, REPOSITORY_FORKED } from "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { platform } from "../../../modules/platform/index.js";
import { getDefaultConfigFileName } from "../onboarding/common.js";
//#region lib/workers/repository/init/apis.ts
async function getJsonFile(file) {
	try {
		return await platform.getJsonFile(file);
	} catch {
		return null;
	}
}
async function validateOptimizeForDisabled(config) {
	if (config.optimizeForDisabled) {
		const renovateConfig = await getJsonFile(getDefaultConfigFileName());
		if (renovateConfig?.enabled === false) throw new Error(REPOSITORY_DISABLED_BY_CONFIG);
		if (config.extends?.includes(":disableRenovate")) {
			logger.debug("Global config disables Renovate - checking renovate.json to see if it is re-enabled");
			if (renovateConfig?.extends?.includes(":enableRenovate") ?? renovateConfig?.ignorePresets?.includes(":disableRenovate") ?? renovateConfig?.enabled) logger.debug("Repository config re-enables Renovate - continuing");
			else {
				logger.debug("Repository config does not re-enable Renovate - skipping");
				throw new Error(REPOSITORY_DISABLED_BY_CONFIG);
			}
		}
	}
}
async function validateIncludeForks(config) {
	if (config.forkProcessing !== "enabled" && config.isFork) {
		const defaultConfigFile = getDefaultConfigFileName();
		const repoConfig = await getJsonFile(defaultConfigFile);
		if (!repoConfig) {
			logger.debug(`Default config file ${defaultConfigFile} not found in repo`);
			throw new Error(REPOSITORY_FORKED);
		}
		if ("includeForks" in repoConfig && repoConfig.includeForks) {
			logger.debug(`Found legacy setting includeForks in ${defaultConfigFile} - continuing`);
			return;
		}
		if (repoConfig.forkProcessing === "enabled") {
			logger.debug(`Found forkProcessing=enabled in ${defaultConfigFile} - continuing`);
			return;
		}
		logger.debug({ config: repoConfig }, `Default config file ${defaultConfigFile} found in repo but does not enable forks`);
		throw new Error(REPOSITORY_FORKED);
	}
}
async function getPlatformConfig(config) {
	const platformConfig = await platform.initRepo(config);
	return {
		...config,
		...platformConfig
	};
}
async function initApis(input) {
	let config = { ...input };
	config = await getPlatformConfig(config);
	await validateOptimizeForDisabled(config);
	await validateIncludeForks(config);
	return config;
}
//#endregion
export { initApis };

//# sourceMappingURL=apis.js.map