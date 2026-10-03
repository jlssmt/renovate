import { InternalGlobalConfigOptions, RenovateConfig, RepoGlobalConfig } from "./types.js";
//#region lib/config/global.d.ts
export declare class GlobalConfig {
  static OPTIONS: readonly ["allowCustomCrateRegistries", "allowPlugins", "allowScripts", "allowShellExecutorForPostUpgradeCommands", "allowedCommands", "allowedEnv", "allowedHeaders", "allowedUnsafeExecutions", "autodiscoverRepoOrder", "autodiscoverRepoSort", "bbUseDevelopmentBranch", "binarySource", "cacheDir", "cacheHardTtlMinutes", "cachePrivatePackages", "cacheTtlOverride", "checkedBranches", "configFileNames", "containerbaseDir", "customEnvVariables", "dockerChildPrefix", "dockerCliOptions", "dockerMaxPages", "dockerSidecarImage", "dockerUser", "dryRun", "encryptedWarning", "endpoint", "executionTimeout", "exposeAllEnv", "gitTimeout", "githubTokenWarn", "httpCacheTtlDays", "ignorePrAuthor", "includeMirrors", "inheritConfigTrusted", "internalHostAccess", "localDir", "migratePresets", "onboarding", "onboardingAutoCloseAge", "onboardingBranch", "onboardingCommitMessage", "onboardingConfig", "onboardingConfigFileName", "onboardingNoDeps", "onboardingPrTitle", "platform", "prCacheSyncMaxPages", "presetCachePersistence", "productLinks", "rebaseAllOpenBranches", "repositoryCacheForceLocal", "requireConfig", "s3Endpoint", "s3PathStyle", "toolSettings", "userAgent"];
  private static config;
  static get(): RepoGlobalConfig & InternalGlobalConfigOptions;
  static get<Key extends keyof RepoGlobalConfig | keyof InternalGlobalConfigOptions>(key: Key): Required<RepoGlobalConfig & InternalGlobalConfigOptions>[Key];
  static set(config: RenovateConfig & RepoGlobalConfig & InternalGlobalConfigOptions): RenovateConfig;
  static reset(): void;
}
//#endregion
//# sourceMappingURL=global.d.ts.map