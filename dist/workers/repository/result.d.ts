import { ConfigErrors, EXTERNAL_HOST_ERROR, MANAGER_LOCKFILE_ERROR, MISSING_API_CREDENTIALS, PlatformErrors, RepositoryErrors, SystemErrors, TemporaryErrors, UNKNOWN_ERROR } from "../../constants/error-messages.js";
import { RenovateConfig } from "../../config/types.js";
//#region lib/workers/repository/result.d.ts
export type ProcessStatus =
/**
 * The repository has been disabled, and will not be processed.
 *
 * See {@link RepositoryErrors} for information on which statuses lead to this.
 */
'disabled' |
/**
 * The repository has onboarded to Renovate, so will see PRs and/or branches raised by Renovate.
 *
 * The repository has not yet merged any PRs, or the repository performs branch-based automerge and those have not been detected (TODO #40635).
 */
'onboarded' |
/**
 * The repository has onboarded to Renovate, and has merged at least 1 Renovate PR.
 *
 * The repository may also perform branch-based automerge which has not been detected (TODO #40635).
 */
'activated' |
/**
 * The repository has an onboarding PR from Renovate that has not yet been reviewed and merged.
 */
'onboarding' | 'unknown';
export interface ProcessResult {
  res: RepositoryResult;
  status: ProcessStatus;
  enabled: boolean | undefined;
  onboarded: boolean | undefined;
  /** the process exit code this result maps to, used when `exitCodeForErrors` is enabled */
  exitCode: number;
}
/** a strong type for any repository result status that Renovate may report */
export type RepositoryResult =
/** repository was processed successfully */
'done' |
/** Renovate performed branch-based automerge on one branch during its run */
'automerged' |
/** the repository is not yet onboarded, and its onboarding PR was processed during this run */
'onboarding' | (typeof SystemErrors)[number] | (typeof RepositoryErrors)[number] | (typeof TemporaryErrors)[number] | (typeof ConfigErrors)[number] | (typeof PlatformErrors)[number] | typeof EXTERNAL_HOST_ERROR | typeof MISSING_API_CREDENTIALS | typeof MANAGER_LOCKFILE_ERROR | typeof UNKNOWN_ERROR;
export declare function processResult(config: RenovateConfig, res: RepositoryResult): ProcessResult;
//#endregion
//# sourceMappingURL=result.d.ts.map