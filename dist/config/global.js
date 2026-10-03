import { globalConfigOptionDefaults } from "../global-config-option-defaults.generated.js";
//#region lib/config/global.ts
var GlobalConfig = class GlobalConfig {
	static OPTIONS = [
		"allowCustomCrateRegistries",
		"allowPlugins",
		"allowScripts",
		"allowShellExecutorForPostUpgradeCommands",
		"allowedCommands",
		"allowedEnv",
		"allowedHeaders",
		"allowedUnsafeExecutions",
		"autodiscoverRepoOrder",
		"autodiscoverRepoSort",
		"bbUseDevelopmentBranch",
		"binarySource",
		"cacheDir",
		"cacheHardTtlMinutes",
		"cachePrivatePackages",
		"cacheTtlOverride",
		"checkedBranches",
		"configFileNames",
		"containerbaseDir",
		"customEnvVariables",
		"dockerChildPrefix",
		"dockerCliOptions",
		"dockerMaxPages",
		"dockerSidecarImage",
		"dockerUser",
		"dryRun",
		"encryptedWarning",
		"endpoint",
		"executionTimeout",
		"exposeAllEnv",
		"gitTimeout",
		"githubTokenWarn",
		"httpCacheTtlDays",
		"ignorePrAuthor",
		"includeMirrors",
		"inheritConfigTrusted",
		"internalHostAccess",
		"localDir",
		"migratePresets",
		"onboarding",
		"onboardingAutoCloseAge",
		"onboardingBranch",
		"onboardingCommitMessage",
		"onboardingConfig",
		"onboardingConfigFileName",
		"onboardingNoDeps",
		"onboardingPrTitle",
		"platform",
		"prCacheSyncMaxPages",
		"presetCachePersistence",
		"productLinks",
		"rebaseAllOpenBranches",
		"repositoryCacheForceLocal",
		"requireConfig",
		"s3Endpoint",
		"s3PathStyle",
		"toolSettings",
		"userAgent"
	];
	static config = {};
	static get(key) {
		const defaultValue = key ? globalConfigOptionDefaults[key] : void 0;
		return key ? GlobalConfig.config[key] ?? defaultValue : GlobalConfig.config;
	}
	static set(config) {
		GlobalConfig.reset();
		const result = { ...config };
		for (const option of GlobalConfig.OPTIONS) {
			GlobalConfig.config[option] = config[option];
			delete result[option];
		}
		return result;
	}
	static reset() {
		GlobalConfig.config = {};
	}
};
//#endregion
export { GlobalConfig };

//# sourceMappingURL=global.js.map