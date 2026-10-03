import { PlatformId } from "../../constants/platforms.js";
import { AutodiscoverConfig, BranchStatusConfig, CreatePRConfig, EnsureCommentConfig, EnsureCommentRemovalConfig, EnsureCommentRemovalConfigByContent, EnsureCommentRemovalConfigByTopic, EnsureIssueConfig, EnsureIssueResult, FileOwnerRule, FindPRConfig, GitUrlOption, Issue, MergePRConfig, Platform, PlatformParams, PlatformPrOptions, PlatformResult, PlatformScm, Pr, PrBodyStruct, PrDebugData, ReattemptPlatformAutomergeConfig, RepoParams, RepoResult, RepoSortMethod, SortMethod, StatusCheckConfig, UpdatePrConfig, VulnerabilityAlert } from "./types.js";
import { AllConfig } from "../../config/types.js";
//#region lib/modules/platform/index.d.ts
export declare function getPlatformList(): string[];
export declare const platform: Platform;
export declare function setPlatformApi(name: PlatformId): void;
export declare function initPlatform(config: AllConfig): Promise<AllConfig>;
//#endregion
export type { AutodiscoverConfig, BranchStatusConfig, CreatePRConfig, EnsureCommentConfig, EnsureCommentRemovalConfig, EnsureCommentRemovalConfigByContent, EnsureCommentRemovalConfigByTopic, EnsureIssueConfig, EnsureIssueResult, FileOwnerRule, FindPRConfig, GitUrlOption, Issue, MergePRConfig, Platform, PlatformParams, PlatformPrOptions, PlatformResult, PlatformScm, Pr, PrBodyStruct, PrDebugData, ReattemptPlatformAutomergeConfig, RepoParams, RepoResult, RepoSortMethod, SortMethod, StatusCheckConfig, UpdatePrConfig, VulnerabilityAlert };
//# sourceMappingURL=index.d.ts.map