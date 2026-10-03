import { BunyanRecord } from "../logger/types.js";
import { BranchResult, PrBlockedBy } from "../workers/types.js";
import { BranchCache, BranchUpgradeCache } from "../util/cache/repository/types.js";
import { ProcessResult, ProcessStatus, RepositoryResult } from "../workers/repository/result.js";
import { ModuleApi, RenovatePackageJson } from "./base.js";
import { BranchStatus } from "./branch-status.js";
import { CommitMessageJSON } from "./commit-message-json.js";
import { CombinedHostRule, HostRule, InternalHostGrant } from "./host-rules.js";
import { PrState } from "./pr-state.js";
import { SkipReason, StageName } from "./skip-reason.js";
import { RangeStrategy } from "./versioning.js";
import { MergeStrategy, RenovateSplit, UpdateType, ValidationMessage } from "../config/types.js";
//#region lib/types/index.d.ts
export type AutoMergeType = 'branch' | 'pr' | 'pr-comment';
type Val = NonNullable<unknown>;
/**
 * A type that can be null or undefined.
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing
 */
export type Nullish<T extends Val> = T | null | undefined;
export type MaybePromise<T> = T | Promise<T>;
/**
 * The Extends utility type ensures that U is a subset of T (typically a union).
 * This helps ensure that we get a typescript error should anything ever be removed
 * from T but still remain in U.
 *
 * @example
 * type MyType = Extends<AutoMergeType, 'pr' | 'branch'>; // works
 *
 * @example
 * type IsBroken = Extends<AutoMergeType, 'pr' | 'branch' | 'oh-no' >;  // This will give a typescript error
 */
export type Extends<T, U extends T> = U;
//#endregion
export type { BranchCache, BranchResult, BranchStatus, BranchUpgradeCache, BunyanRecord, CombinedHostRule, CommitMessageJSON, HostRule, InternalHostGrant, MergeStrategy, ModuleApi, PrBlockedBy, PrState, ProcessResult, ProcessStatus, RangeStrategy, RenovatePackageJson, RenovateSplit, RepositoryResult, SkipReason, StageName, UpdateType, ValidationMessage };
//# sourceMappingURL=index.d.ts.map