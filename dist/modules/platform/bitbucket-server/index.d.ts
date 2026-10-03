import { BranchStatusConfig, CreatePRConfig, EnsureCommentConfig, EnsureCommentRemovalConfig, EnsureIssueConfig, EnsureIssueResult, FileOwnerRule, FindPRConfig, Issue, MergePRConfig, PlatformParams, PlatformResult, Pr, ReattemptPlatformAutomergeConfig, RepoParams, RepoResult, UpdatePrConfig } from "../types.js";
import { BranchStatus } from "../../../types/branch-status.js";
import "../../../types/index.js";
import { BbsPr } from "./types.js";
//#region lib/modules/platform/bitbucket-server/index.d.ts
export declare const id = "bitbucket-server";
export declare function initPlatform({ endpoint, token, username, password, gitAuthor }: PlatformParams): Promise<PlatformResult>;
export declare function getRepos(): Promise<string[]>;
export declare function getRawFile(fileName: string, repoName?: string, branchOrTag?: string): Promise<string | null>;
export declare function getJsonFile(fileName: string, repoName?: string, branchOrTag?: string): Promise<any>;
export declare function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, gitUrl }: RepoParams): Promise<RepoResult>;
export declare function getBranchForceRebase(_branchName: string): Promise<boolean>;
export declare function getPr(prNo: number, refreshCache?: boolean): Promise<BbsPr | null>;
export declare function getPrList(): Promise<Pr[]>;
export declare function findPr({ branchName, prTitle, state, includeOtherAuthors }: FindPRConfig): Promise<Pr | null>;
export declare function getBranchPr(branchName: string): Promise<BbsPr | null>;
export declare function refreshPr(number: number): Promise<void>;
export declare function getBranchStatus(branchName: string): Promise<BranchStatus>;
export declare function getBranchStatusCheck(branchName: string, context: string): Promise<BranchStatus | null>;
export declare function setBranchStatus({ branchName, context, description, state, url: targetUrl }: BranchStatusConfig): Promise<void>;
export declare function findIssue(title: string): Promise<Issue | null>;
export declare function ensureIssue({ title }: EnsureIssueConfig): Promise<EnsureIssueResult | null>;
export declare function getIssueList(): Promise<Issue[]>;
export declare function ensureIssueClosing(title: string): Promise<void>;
export declare function addAssignees(iid: number, assignees: string[]): Promise<void>;
export declare function addReviewers(prNo: number, reviewers: string[]): Promise<void>;
/**
 * Resolves Bitbucket users by email address,
 * restricted to users who have REPO_READ permission on the target repository.
 *
 * @param emailAddress - A string that could be the user's email address.
 * @returns List of usernames for active, matched users.
 */
export declare function getUsernamesByEmail(emailAddress: string): Promise<string[]>;
export declare function deleteLabel(issueNo: number, label: string): Promise<void>;
export declare function ensureComment({ number, topic, content }: EnsureCommentConfig): Promise<boolean>;
export declare function ensureCommentRemoval(deleteConfig: EnsureCommentRemovalConfig): Promise<void>;
export declare function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: rawDescription, platformPrOptions }: CreatePRConfig): Promise<Pr>;
export declare function reattemptPlatformAutomerge({ number, platformPrOptions }: ReattemptPlatformAutomergeConfig): Promise<void>;
export declare function updatePr({ number: prNo, prTitle: title, prBody: rawDescription, state, bitbucketInvalidReviewers, targetBranch }: UpdatePrConfig & {
  bitbucketInvalidReviewers?: string[] | undefined;
}): Promise<void>;
export declare function mergePr({ branchName, id: prNo }: MergePRConfig): Promise<boolean>;
export declare function expandGroupMembers(reviewers: string[]): Promise<string[]>;
export declare function extractRulesFromCodeOwnersLines(cleanedLines: string[]): FileOwnerRule[];
export declare function massageMarkdown(input: string): string;
export declare function maxBodyLength(): number;
//#endregion
//# sourceMappingURL=index.d.ts.map