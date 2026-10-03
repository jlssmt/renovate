import { init } from "../../../util/cache/memory/index.js";
import { GlobalConfig } from "../../../config/global.js";
import { setRepositoryLogLevelRemaps } from "../../../logger/remap.js";
import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { getAll } from "../../../util/host-rules.js";
import { applySecretsAndVariablesToConfig } from "../../../config/secrets.js";
import { initMutexes } from "../../../util/mutex.js";
import { cloneSubmodules, setUserRepoConfig } from "../../../util/git/index.js";
import { platform } from "../../../modules/platform/index.js";
import { PackageFiles } from "../package-files.js";
import { checkIfConfigured } from "../configured.js";
import { initApis } from "./apis.js";
import { initializeCaches, resetCaches } from "./cache.js";
import { getRepoConfig } from "./config.js";
import { detectVulnerabilityAlerts } from "./vulnerability.js";
//#region lib/workers/repository/init/index.ts
function initializeConfig(config) {
	return {
		...clone(config),
		errors: [],
		warnings: [],
		branchList: []
	};
}
function warnOnUnsupportedOptions(config) {
	if (config.filterUnavailableUsers && !platform.filterUnavailableUsers) {
		const platform = GlobalConfig.get("platform");
		logger.warn({ platform }, `Configuration option 'filterUnavailableUsers' is not supported on the current platform.`);
	}
	if (config.expandCodeOwnersGroups && !platform.expandGroupMembers) {
		const platform = GlobalConfig.get("platform");
		logger.warn({ platform }, `Configuration option 'expandCodeOwnersGroups' is not supported on the current platform.`);
	}
}
async function initRepo(config_) {
	PackageFiles.clear();
	let config = initializeConfig(config_);
	await resetCaches();
	logger.once.reset();
	init();
	initMutexes();
	config = await initApis(config);
	await initializeCaches(config);
	config = await getRepoConfig(config);
	setRepositoryLogLevelRemaps(config.logLevelRemap);
	if (config.mode === "silent") logger.info("Repository is running with mode=silent and will not make Issues or PRs by default");
	checkIfConfigured(config);
	warnOnUnsupportedOptions(config);
	config = applySecretsAndVariablesToConfig({ config });
	setUserRepoConfig(config);
	config = await detectVulnerabilityAlerts(config);
	// istanbul ignore if
	if (config.printConfig) logger.info({
		config,
		hostRules: getAll()
	}, "Full resolved config and hostRules including presets");
	await cloneSubmodules(!!config.cloneSubmodules, config.cloneSubmodulesFilter);
	return config;
}
//#endregion
export { initRepo };

//# sourceMappingURL=index.js.map