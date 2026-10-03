import { ExtraEnv } from "../exec/types.js";
import { GitProtocol } from "../../types/git.js";
import { LongCommitSha } from "../schema-utils/git.js";
import { CommitFilesConfig, CommitResult, DiffTreeItem, PushFilesConfig, StatusResult, StorageConfig } from "./types.js";
import { RenovateConfig } from "../../config/types.js";
import { setNoVerify } from "./config.js";
import { setPrivateKey } from "./private-key.js";
import { DateTime } from "luxon";
import { SimpleGit, SimpleGitOptions } from "simple-git";
//#region lib/util/git/index.d.ts
export declare const RENOVATE_FORK_UPSTREAM = "renovate-fork-upstream";
interface CreateSimpleGitOptions {
  config?: Partial<SimpleGitOptions>;
  env?: ExtraEnv;
  authentication?: {
    hostTypes?: readonly string[];
  };
}
export declare function createSimpleGit({ config, env, authentication }?: CreateSimpleGitOptions): SimpleGit;
export declare function gitRetry<T>(gitFunc: () => Promise<T>): Promise<T>;
export declare const GIT_MINIMUM_VERSION = "2.33.0";
export declare function validateGitVersion(): Promise<boolean>;
export declare function fetchRevSpec(...revSpec: string[]): Promise<void>;
export declare function initRepo(args: StorageConfig): Promise<void>;
export declare function resetToCommit(commit: LongCommitSha): Promise<void>;
export declare function setGitAuthor(gitAuthor: string | undefined): void;
export declare function writeGitAuthor(): Promise<void>;
export declare function setUserRepoConfig({ gitIgnoredAuthors, gitAuthor }: RenovateConfig): void;
export declare function setPlatformIgnoredAuthors(emails?: string[]): void;
/**
 * Clears the in-memory `isBranchModified()` results.
 *
 * @internal Test helper, so read-only tests can share one `initRepo()`.
 */
export declare function clearBranchIsModifiedCache(): void;
export declare function getSubmodules(): Promise<string[]>;
export declare function cloneSubmodules(shouldClone: boolean, cloneSubmodulesFilter: string[] | undefined): Promise<void>;
export declare function isCloned(): boolean;
export declare function isFileModeEnabled(): Promise<boolean>;
export declare const syncGit: () => Promise<void>;
export declare function getRepoStatus(path?: string): Promise<StatusResult>;
export declare function branchExists(branchName: string): boolean;
export declare function getBranchCommit(branchName: string): LongCommitSha | null;
export declare function getBranchUpdateDate(branchName: string): Promise<DateTime | null>;
export declare function getAllBranchUpdateDates(): Promise<Record<string, DateTime>>;
export declare function getCommitMessages(): Promise<string[]>;
export declare function checkoutBranch(branchName: string): Promise<LongCommitSha>;
export declare function checkoutBranchFromRemote(branchName: string, remoteName: string): Promise<LongCommitSha>;
/**
 * Returns the remote-tracking ref path for a virtual branch.
 */
export declare function remoteBranchRef(branchName: string): string;
/**
 * Set a virtual branch's remote-tracking ref and add it to the
 * virtual-branch registry (config.virtualBranches).
 *
 * Used after pushing (to keep tracking in sync with the remote) and in
 * createPr() when the Gerrit change ref becomes available.
 *
 * @param branchName Virtual branch name to set
 * @param ref The ref this virtual branch is fetched from (e.g., 'refs/changes/34/1234/1')
 * @param commitSha The commit SHA the virtual branch points to.
 */
export declare function setVirtualBranch(branchName: string, ref: string, commitSha: LongCommitSha): Promise<void>;
export declare function resetHardFromRemote(remoteAndBranch: string): Promise<void>;
export declare function forcePushToRemote(branchName: string, remote: string): Promise<void>;
export declare function getFileList(): Promise<string[]>;
export declare function getBranchList(): string[];
export declare function isBranchBehindBase(branchName: string, baseBranch: string): Promise<boolean>;
export declare function isBranchModified(branchName: string, baseBranch: string): Promise<boolean>;
export declare function isBranchConflicted(baseBranch: string, branch: string): Promise<boolean>;
export declare function deleteBranch(branchName: string): Promise<void>;
export declare function mergeToLocal(branchName: string): Promise<void>;
export declare function mergeBranch(branchName: string): Promise<void>;
export declare function getBranchLastCommitTime(branchName: string): Promise<Date>;
export declare function getBranchFiles(branchName: string): Promise<string[] | null>;
export declare function getBranchFilesFromCommit(referenceCommit: LongCommitSha): Promise<string[] | null>;
export declare function getFile(filePath: string, branchName?: string): Promise<string | null>;
export declare function getFiles(fileNames: string[]): Promise<Record<string, string | null>>;
export declare function hasDiff(sourceRef: string, targetRef: string): Promise<boolean>;
/**
 *
 * Prepare local branch with commit
 *
 * 0. Hard reset
 * 1. Creates local branch with `origin/` prefix
 * 2. Perform `git add` (respecting mode) and `git remove` for each file
 * 3. Perform commit
 * 4. Check whether resulting commit is empty or not (due to .gitignore)
 * 5. If not empty, return commit info for further processing
 *
 */
export declare function prepareCommit({ branchName, files, message, trailers, force }: CommitFilesConfig): Promise<CommitResult | null>;
export declare function pushCommit({ sourceRef, targetRef, files, pushOptions }: PushFilesConfig): Promise<boolean>;
export declare function fetchBranch(branchName: string): Promise<LongCommitSha | null>;
export declare function commitFiles(commitConfig: CommitFilesConfig): Promise<LongCommitSha | null>;
export declare function getUrl({ protocol, auth, hostname, host, repository }: {
  protocol?: GitProtocol;
  auth?: string;
  hostname?: string;
  host?: string;
  repository: string;
}): string;
/**
 *
 * Non-branch refs allow us to store git objects without triggering CI pipelines.
 * It's useful for API-based branch rebasing.
 *
 * @see https://stackoverflow.com/questions/63866947/pushing-git-non-branch-references-to-a-remote/63868286
 *
 */
export declare function pushCommitToRenovateRef(commitSha: string, refName: string): Promise<void>;
/**
 *
 * Removes all remote "refs/renovate/branches/*" refs in two steps:
 *
 * Step 1: list refs
 *
 *   $ git ls-remote origin "refs/renovate/branches/*"
 *
 *   > cca38e9ea6d10946bdb2d0ca5a52c205783897aa        refs/renovate/branches/foo
 *   > 29ac154936c880068994e17eb7f12da7fdca70e5        refs/renovate/branches/bar
 *   > 3fafaddc339894b6d4f97595940fd91af71d0355        refs/renovate/branches/baz
 *   > ...
 *
 * Step 2:
 *
 *   $ git push --delete origin refs/renovate/branches/foo refs/renovate/branches/bar refs/renovate/branches/baz
 *
 * If Step 2 fails because the repo doesn't allow bulk changes, we'll remove them one by one instead:
 *
 *   $ git push --delete origin refs/renovate/branches/foo
 *   $ git push --delete origin refs/renovate/branches/bar
 *   $ git push --delete origin refs/renovate/branches/baz
 */
export declare function clearRenovateRefs(): Promise<void>;
/**
 * Get the tree SHA for a commit.
 */
export declare function getCommitTreeSha(commitSha: LongCommitSha): Promise<LongCommitSha>;
/**
 * Return only the files that changed between two commits.
 * Deletions have `sha: null` (for use with GitHub's `base_tree` API).
 */
export declare function diffCommitTree(parentCommitSha: LongCommitSha, commitSha: LongCommitSha): Promise<DiffTreeItem[]>;
/**
 * Synchronize a forked branch with its upstream counterpart.
 *
 * syncForkWithUpstream updates the fork's branch, to match the corresponding branch in the upstream repository.
 * The steps are:
 * 1. Check if the branch exists locally.
 * 2. If the branch exists locally: checkout the local branch.
 * 3. If the branch does _not_ exist locally: checkout the upstream branch.
 * 4. Reset the local branch to match the upstream branch.
 * 5. Force push the (updated) local branch to the origin repository.
 *
 * @param {string} branchName - The name of the branch to synchronize.
 * @returns A promise that resolves to True if the synchronization is successful, or `false` if an error occurs.
 */
export declare function syncForkWithUpstream(branchName: string): Promise<void>;
export declare function getRemotes(): Promise<string[]>;
//#endregion
export { setNoVerify, setPrivateKey };
//# sourceMappingURL=index.d.ts.map