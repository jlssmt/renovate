import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { REPOSITORY_ACCESS_FORBIDDEN, REPOSITORY_ARCHIVED, REPOSITORY_CHANGED, REPOSITORY_DISABLED, REPOSITORY_EMPTY, REPOSITORY_MIRRORED, REPOSITORY_NOT_FOUND, REPOSITORY_PENDING_DELETION, TEMPORARY_ERROR } from "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray } from "../../../util/array.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, getQueryString, parseUrl } from "../../../util/url.js";
import { noLeadingAtSymbol, parseJson } from "../../../util/common.js";
import { parseInteger } from "../../../util/number.js";
import { all } from "../../../util/promises.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { branchExists, getBranchCommit, initRepo as initRepo$1 } from "../../../util/git/index.js";
import { setBaseUrl } from "../../../util/http/gitlab.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { getRepoFile } from "./files.js";
import { LastPipelineId, MergeTrainCarStatus } from "./schema.js";
import { getMemberUserIDs, getMemberUsernames, getProjectMembersByRole, getUserID, gitlabApi, isUserBusy } from "./http.js";
import { getMR, updateMR } from "./merge-request.js";
import { DRAFT_PREFIX, DRAFT_PREFIX_DEPRECATED, defaults, getRepoUrl, prInfo } from "./utils.js";
import { GitlabPrCache } from "./pr-cache.js";
import { getRoleAccessLevel } from "./roles.js";
import { extractRulesFromCodeOwnersLines } from "./code-owners.js";
import { isArray, isEmptyArray, isNonEmptyArray, isString } from "@sindresorhus/is";
import semver from "semver";
import { setTimeout } from "node:timers/promises";
import pMap from "p-map";
//#region lib/modules/platform/gitlab/index.ts
var gitlab_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	expandGroupMembers: () => expandGroupMembers,
	extractRulesFromCodeOwnersLines: () => extractRulesFromCodeOwnersLines,
	filterUnavailableUsers: () => filterUnavailableUsers,
	findIssue: () => findIssue,
	findPr: () => findPr,
	getBranchForceRebase: () => getBranchForceRebase,
	getBranchPr: () => getBranchPr,
	getBranchStatus: () => getBranchStatus,
	getBranchStatusCheck: () => getBranchStatusCheck,
	getIssue: () => getIssue,
	getIssueList: () => getIssueList,
	getJsonFile: () => getJsonFile,
	getPr: () => getPr,
	getPrList: () => getPrList,
	getRawFile: () => getRawFile,
	getRepos: () => getRepos,
	id: () => id,
	initPlatform: () => initPlatform,
	initRepo: () => initRepo,
	isBranchMergeQueueEnabled: () => isBranchMergeQueueEnabled,
	isPrInMergeQueue: () => isPrInMergeQueue,
	labelCharLimit: () => labelCharLimit,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	reattemptPlatformAutomerge: () => reattemptPlatformAutomerge,
	resetPlatform: () => resetPlatform,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
let config = {};
function resetPlatform() {
	config = {};
	draftPrefix = DRAFT_PREFIX;
	defaults.hostType = "gitlab";
	defaults.endpoint = "https://gitlab.com/api/v4/";
	defaults.version = "0.0.0";
	setBaseUrl(defaults.endpoint);
}
const id = "gitlab";
let draftPrefix = DRAFT_PREFIX;
let botUserName;
async function initPlatform({ endpoint, username, token, gitAuthor }) {
	if (!token) throw new Error("Init: You must configure a GitLab personal access token");
	if (!endpoint) logger.debug(`Using default GitLab endpoint: ${defaults.endpoint}`);
	else if (parseUrl(endpoint) === null) throw new Error(`Invalid GitLab endpoint URL: ${endpoint}`);
	else {
		defaults.endpoint = ensureTrailingSlash(endpoint);
		setBaseUrl(defaults.endpoint);
	}
	const platformConfig = { endpoint: defaults.endpoint };
	let gitlabVersion;
	try {
		if (!gitAuthor) {
			const user = (await gitlabApi.getJsonUnchecked(`user`, { token })).body;
			platformConfig.gitAuthor = `${user.name} <${user.commit_email ?? user.email}>`;
			botUserName = user.name;
		}
		const env = getEnv();
		/* v8 ignore next: experimental feature */
		if (env.RENOVATE_X_PLATFORM_VERSION) gitlabVersion = env.RENOVATE_X_PLATFORM_VERSION;
		else gitlabVersion = (await gitlabApi.getJsonUnchecked("version", { token })).body.version;
		logger.debug(`GitLab version is: ${gitlabVersion}`);
		[gitlabVersion] = gitlabVersion.split("-");
		defaults.version = gitlabVersion;
	} catch (err) {
		logger.debug({ err }, "Error authenticating with GitLab. Check that your token includes \"api\" permissions");
		throw new Error("Init: Authentication failure");
	}
	draftPrefix = semver.lt(defaults.version, "13.2.0") ? DRAFT_PREFIX_DEPRECATED : DRAFT_PREFIX;
	botUserName ??= username;
	return platformConfig;
}
async function getRepos(config) {
	logger.debug("Autodiscovering GitLab repositories");
	const queryParams = {
		membership: true,
		per_page: 100,
		with_merge_requests_enabled: true,
		min_access_level: 30,
		archived: false,
		...config?.sort && { order_by: config.sort },
		...config?.order && { sort: config.order }
	};
	if (config?.topics?.length) queryParams.topic = config.topics.join(",");
	const urls = [];
	if (config?.namespaces?.length) {
		queryParams.with_shared = false;
		queryParams.include_subgroups = true;
		urls.push(...config.namespaces.map((namespace) => `groups/${urlEscape(namespace)}/projects?${getQueryString(queryParams)}`));
	} else urls.push(`projects?${getQueryString(queryParams)}`);
	try {
		const repos = (await pMap(urls, (url) => gitlabApi.getJsonUnchecked(url, { paginate: true }), { concurrency: 2 })).flatMap((response) => response.body);
		logger.debug(`Discovered ${repos.length} project(s)`);
		return repos.filter((repo) => !repo.mirror || config?.includeMirrors).filter((repo) => !repo.marked_for_deletion_at).map((repo) => repo.path_with_namespace);
	} catch (err) {
		logger.error({ err }, `GitLab getRepos error`);
		throw err;
	}
}
function urlEscape(str) {
	return str?.replace(regEx(/\//g), "%2F");
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const repo = urlEscape(repoName) ?? config.repository;
	return await getRepoFile(gitlabApi, repo, fileName, branchOrTag, { cacheProvider: memCacheProvider });
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, gitUrl }) {
	config = {};
	config.repository = urlEscape(repository);
	config.cloneSubmodules = cloneSubmodules;
	config.cloneSubmodulesFilter = cloneSubmodulesFilter;
	config.ignorePrAuthor = GlobalConfig.get("ignorePrAuthor");
	let res;
	try {
		res = await gitlabApi.getJsonUnchecked(`projects/${config.repository}`);
		if (res.body.archived) {
			logger.debug("Repository is archived - throwing error to abort renovation");
			throw new Error(REPOSITORY_ARCHIVED);
		}
		if (res.body.marked_for_deletion_at) {
			logger.debug("Repository is marked for deletion - throwing error to abort renovation");
			throw new Error(REPOSITORY_PENDING_DELETION);
		}
		if (res.body.mirror && GlobalConfig.get("includeMirrors") !== true) {
			logger.debug("Repository is a mirror - throwing error to abort renovation");
			throw new Error(REPOSITORY_MIRRORED);
		}
		if (res.body.repository_access_level === "disabled") {
			logger.debug("Repository portion of project is disabled - throwing error to abort renovation");
			throw new Error(REPOSITORY_DISABLED);
		}
		if (res.body.merge_requests_access_level === "disabled") {
			logger.debug("MRs are disabled for the project - throwing error to abort renovation");
			throw new Error(REPOSITORY_DISABLED);
		}
		if (res.body.default_branch === null || res.body.empty_repo) throw new Error(REPOSITORY_EMPTY);
		config.defaultBranch = res.body.default_branch;
		/* v8 ignore next -- unreachable: null/empty default_branch already threw REPOSITORY_EMPTY above */
		if (!config.defaultBranch) {
			logger.warn({ resBody: res.body }, "Error fetching GitLab project");
			throw new Error(TEMPORARY_ERROR);
		}
		config.mergeMethod = res.body.merge_method || "merge";
		config.mergeTrainsEnabled = res.body.merge_trains_enabled ?? false;
		if (res.body.squash_option) config.squash = res.body.squash_option === "always" || res.body.squash_option === "default_on";
		logger.debug(`${repository} default branch = ${config.defaultBranch}`);
		logger.debug("Enabling Git FS");
		const url = getRepoUrl(repository, gitUrl, res);
		await initRepo$1({
			...config,
			url
		});
	} catch (err) /* v8 ignore next -- initRepo error mapping needs git-level failures not mocked in specs */ {
		logger.debug({ err }, "Caught initRepo error");
		if (err.message.includes("HEAD is not a symbolic ref")) throw new Error(REPOSITORY_EMPTY);
		if ([
			"archived",
			"empty",
			"pending-deletion"
		].includes(err.message)) throw err;
		if (err.statusCode === 403) throw new Error(REPOSITORY_ACCESS_FORBIDDEN);
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		if (err.message === "disabled") throw err;
		logger.debug({ err }, "Unknown GitLab initRepo error");
		throw err;
	}
	return {
		defaultBranch: config.defaultBranch,
		isFork: !!res.body.forked_from_project,
		repoFingerprint: repoFingerprint(res.body.id, defaults.endpoint)
	};
}
function getBranchForceRebase() {
	const forceRebase = config?.mergeMethod !== "merge";
	if (forceRebase) logger.once.debug(`mergeMethod is ${config.mergeMethod} so PRs will be kept up-to-date with base branch`);
	return Promise.resolve(forceRebase);
}
/**
* Merge trains are GitLab's equivalent of a merge queue. They are enabled per
* project, so the branch name is not needed.
* https://docs.gitlab.com/ci/pipelines/merge_trains/
*/
function isBranchMergeQueueEnabled(_branchName) {
	return Promise.resolve(config.mergeTrainsEnabled);
}
/**
* GitLab answers with 404 if the MR is not on a merge train. A car that has
* already been merged is not waiting any more.
* https://docs.gitlab.com/api/merge_trains/#get-the-status-of-a-merge-request-on-a-merge-train
*/
async function isPrInMergeQueue(id) {
	if (!config.mergeTrainsEnabled) return false;
	try {
		const { body: status } = await gitlabApi.getJson(`projects/${config.repository}/merge_trains/merge_requests/${id}`, { memCache: false }, MergeTrainCarStatus);
		return status !== "merged";
	} catch (err) {
		if (err.statusCode !== 404) logger.debug({ err }, "Failed to fetch merge train status");
		return false;
	}
}
async function getStatus(branchName, useCache = true) {
	const branchSha = getBranchCommit(branchName);
	try {
		const url = `projects/${config.repository}/repository/commits/${branchSha}/statuses`;
		const opts = { paginate: true };
		if (useCache) opts.cacheProvider = memCacheProvider;
		else opts.memCache = false;
		return (await gitlabApi.getJsonUnchecked(url, opts)).body;
	} catch (err) /* v8 ignore next -- commit status fetch failures map 404 to REPOSITORY_CHANGED, not mocked in specs */ {
		logger.debug({ err }, "Error getting commit status");
		if (err.response?.statusCode === 404) throw new Error(REPOSITORY_CHANGED);
		throw err;
	}
}
const gitlabToRenovateStatusMapping = {
	pending: "yellow",
	created: "yellow",
	manual: "yellow",
	running: "yellow",
	waiting_for_resource: "yellow",
	success: "green",
	failed: "red",
	canceled: "red",
	skipped: "red",
	scheduled: "yellow"
};
async function getBranchStatus(branchName, internalChecksAsSuccess) {
	logger.debug(`getBranchStatus(${branchName})`);
	if (!branchExists(branchName)) throw new Error(REPOSITORY_CHANGED);
	const branchStatuses = await getStatus(branchName);
	/* v8 ignore next -- defensive: getStatus always resolves to an array in specs */
	if (!isArray(branchStatuses)) {
		logger.warn({
			branchName,
			branchStatuses
		}, "Empty or unexpected branch statuses");
		return "yellow";
	}
	logger.debug(`Got res with ${branchStatuses.length} results`);
	const mr = await getBranchPr(branchName);
	if (mr && mr.sha !== mr.headPipelineSha && mr.headPipelineStatus) {
		logger.debug("Merge request head pipeline has different sha to commit, assuming merged results pipeline");
		branchStatuses.push({
			status: mr.headPipelineStatus,
			name: "head_pipeline"
		});
	}
	const res = branchStatuses.filter((check) => check.status !== "skipped");
	if (res.length === 0) return "yellow";
	if (!internalChecksAsSuccess && branchStatuses.every((check) => check.name?.startsWith("renovate/") && gitlabToRenovateStatusMapping[check.status] === "green")) {
		logger.debug("Successful checks are all internal renovate/ checks, so returning \"pending\" branch status");
		return "yellow";
	}
	let status = "green";
	res.filter((check) => !check.allow_failure).forEach((check) => {
		// v8 ignore else -- TODO: add test #40625
		if (status !== "red") {
			let mappedStatus = gitlabToRenovateStatusMapping[check.status];
			if (!mappedStatus) {
				logger.warn({ check }, "Could not map GitLab check.status to Renovate status");
				mappedStatus = "yellow";
			}
			if (mappedStatus !== "green") {
				logger.trace({ check }, "Found non-green check");
				status = mappedStatus;
			}
		}
	});
	return status;
}
async function getPrList() {
	return await GitlabPrCache.getPrs(gitlabApi, config.repository, botUserName, !!config.ignorePrAuthor);
}
async function ignoreApprovals(pr) {
	try {
		const url = `projects/${config.repository}/merge_requests/${pr}/approval_rules`;
		const { body: rules } = await gitlabApi.getJsonUnchecked(url);
		const ruleName = "renovateIgnoreApprovals";
		const existingAnyApproverRule = rules?.find(({ rule_type }) => rule_type === "any_approver");
		const existingRegularApproverRules = rules?.filter(({ rule_type, name }) => rule_type !== "any_approver" && name !== ruleName && rule_type !== "report_approver" && rule_type !== "code_owner");
		if (existingRegularApproverRules?.length) await all(existingRegularApproverRules.map((rule) => async () => {
			await gitlabApi.deleteJson(`${url}/${rule.id}`);
		}));
		if (existingAnyApproverRule) {
			await gitlabApi.putJson(`${url}/${existingAnyApproverRule.id}`, { body: {
				...existingAnyApproverRule,
				approvals_required: 0
			} });
			return;
		}
		if (!rules?.find(({ name }) => name === ruleName)) await gitlabApi.postJson(url, { body: {
			name: ruleName,
			approvals_required: 0
		} });
	} catch (err) {
		logger.warn({ err }, "GitLab: Error adding approval rule");
	}
}
async function tryPrAutomerge(pr, platformPrOptions) {
	try {
		if (platformPrOptions?.gitLabIgnoreApprovals) await ignoreApprovals(pr);
		if (platformPrOptions?.usePlatformAutomerge) {
			const desiredDetailedMergeStatus = [
				"mergeable",
				"ci_still_running",
				"not_approved"
			];
			const desiredPipelineStatus = ["failed", "running"];
			const desiredStatus = "can_be_merged";
			const env = getEnv();
			const retryTimes = parseInteger(env.RENOVATE_X_GITLAB_AUTO_MERGEABLE_CHECK_ATTEMPS, 5);
			const mergeDelay = parseInteger(env.RENOVATE_X_GITLAB_MERGE_REQUEST_DELAY, 250);
			for (let attempt = 1; attempt <= retryTimes; attempt += 1) {
				const { body } = await gitlabApi.getJsonUnchecked(`projects/${config.repository}/merge_requests/${pr}`, { memCache: false });
				if (body.merge_when_pipeline_succeeds === true) {
					logger.debug("Skipping automerge retry - merge_when_pipeline_succeeds already enabled");
					return;
				}
				const use_detailed_merge_status = !!body.detailed_merge_status;
				const detailed_merge_status_check = use_detailed_merge_status && desiredDetailedMergeStatus.includes(body.detailed_merge_status);
				const deprecated_merge_status_check = !use_detailed_merge_status && body.merge_status === desiredStatus;
				if ((detailed_merge_status_check || deprecated_merge_status_check) && body.pipeline !== null && desiredPipelineStatus.includes(body.pipeline.status)) break;
				logger.debug(`PR not yet in mergeable state. Retrying ${attempt}`);
				await setTimeout(mergeDelay * attempt ** 2);
			}
			const useMergeTrain = config.mergeTrainsEnabled && !semver.lt(defaults.version, "17.11.0");
			if (config.mergeTrainsEnabled && !useMergeTrain) logger.once.warn({ version: defaults.version }, "Merge trains require GitLab 17.11.0 or later, falling back to /merge endpoint");
			for (let attempt = 1; attempt <= retryTimes; attempt += 1) {
				try {
					if (useMergeTrain) await gitlabApi.postJson(`projects/${config.repository}/merge_trains/merge_requests/${pr}`, { body: { auto_merge: true } });
					else await gitlabApi.putJson(`projects/${config.repository}/merge_requests/${pr}/merge`, { body: {
						should_remove_source_branch: true,
						merge_when_pipeline_succeeds: true
					} });
					break;
				} catch (err) {
					logger.debug({ err }, `Automerge on PR creation failed. Retrying ${attempt}`);
				}
				await setTimeout(mergeDelay * attempt ** 2);
			}
		}
	} catch (err) /* v8 ignore next -- defensive: retry loop already swallows errors, outer catch is a last resort */ {
		logger.debug({ err }, "Automerge on PR creation failed");
	}
}
async function approveMr(mrNumber) {
	const env = getEnv();
	const opts = {};
	if (env.RENOVATE_X_GITLAB_AUTO_APPROVE_TOKEN) opts.token = env.RENOVATE_X_GITLAB_AUTO_APPROVE_TOKEN;
	logger.debug(`approveMr(${mrNumber})`);
	try {
		await gitlabApi.postJson(`projects/${config.repository}/merge_requests/${mrNumber}/approve`, opts);
	} catch (err) {
		logger.warn({ err }, "GitLab: Error approving merge request");
	}
}
async function createPr({ sourceBranch, targetBranch, prTitle, prBody: rawDescription, draftPR, labels, platformPrOptions }) {
	let title = prTitle;
	if (draftPR) title = draftPrefix + title;
	const description = sanitize(rawDescription);
	logger.debug(`Creating Merge Request: ${title}`);
	const res = await gitlabApi.postJson(`projects/${config.repository}/merge_requests`, { body: {
		source_branch: sourceBranch,
		target_branch: targetBranch,
		remove_source_branch: true,
		title,
		description,
		labels: coerceArray(labels).join(","),
		squash: config.squash
	} });
	const pr = prInfo(res.body);
	await GitlabPrCache.setPr(gitlabApi, config.repository, botUserName, pr, !!config.ignorePrAuthor);
	if (platformPrOptions?.autoApprove) await approveMr(pr.number);
	await tryPrAutomerge(pr.number, platformPrOptions);
	return pr;
}
async function getPr(iid) {
	logger.debug(`getPr(${iid})`);
	const mr = await getMR(config.repository, iid);
	return prInfo(mr);
}
async function updatePr({ number: iid, prTitle, prBody: description, addLabels, removeLabels, state, platformPrOptions, targetBranch }) {
	let title = prTitle;
	if ((await getPrList()).find((pr) => pr.number === iid)?.isDraft) title = draftPrefix + title;
	const newState = {
		["closed"]: "close",
		["open"]: "reopen"
	}[state];
	const body = {
		title,
		description: sanitize(description),
		...newState && { state_event: newState }
	};
	if (targetBranch) body.target_branch = targetBranch;
	if (addLabels) body.add_labels = addLabels;
	if (removeLabels) body.remove_labels = removeLabels;
	const updatedPrInfo = (await gitlabApi.putJson(`projects/${config.repository}/merge_requests/${iid}`, { body })).body;
	const updatedPr = prInfo(updatedPrInfo);
	await GitlabPrCache.setPr(gitlabApi, config.repository, botUserName, updatedPr, !!config.ignorePrAuthor);
	if (platformPrOptions?.autoApprove) await approveMr(iid);
}
async function reattemptPlatformAutomerge({ number: iid, platformPrOptions }) {
	await tryPrAutomerge(iid, platformPrOptions);
	logger.debug(`PR platform automerge re-attempted...prNo: ${iid}`);
}
async function tryAddPrToMergeTrain(id) {
	try {
		await gitlabApi.postJson(`projects/${config.repository}/merge_trains/merge_requests/${id}`);
		logger.debug(`MR !${id} added to the merge train`);
		return true;
	} catch (err) {
		logger.debug({ err }, "Failed to add MR to the merge train");
		return false;
	}
}
async function mergePr({ id }) {
	if (config.mergeTrainsEnabled) return tryAddPrToMergeTrain(id);
	try {
		await gitlabApi.putJson(`projects/${config.repository}/merge_requests/${id}/merge`, { body: { should_remove_source_branch: true } });
		return true;
	} catch (err) /* v8 ignore next -- merge rejection statuses (401/406) are mapped to false, not mocked in specs */ {
		if (err.statusCode === 401) {
			logger.debug("No permissions to merge PR");
			return false;
		}
		if (err.statusCode === 406) {
			logger.debug({ err }, "PR not acceptable for merging");
			return false;
		}
		logger.debug({ err }, "merge PR error");
		logger.debug("PR merge failed");
		return false;
	}
}
function massageMarkdown(input) {
	const desc = input.replace(regEx(/Pull Request/g), "Merge Request").replace(regEx(/\bPR: #/g), "MR: !").replace(regEx(/\bPR\b/g), "MR").replace(regEx(/\bPRs\b/g), "MRs").replace(regEx(/\]\(\.\.\/pull\//g), "](!").replace(regEx(/\]\(\.\.\/issues\//g), "](#").replace(regEx(/\u0000/g), "");
	return smartTruncate(desc, maxBodyLength());
}
function maxBodyLength() {
	if (semver.lt(defaults.version, "13.4.0")) {
		logger.debug({ version: defaults.version }, "GitLab versions earlier than 13.4 have issues with long descriptions, truncating to 25K characters");
		return 25e3;
	}
	return 1e6;
}
/* v8 ignore next: no need to test */
function labelCharLimit() {
	return 255;
}
function matchesState(state, desiredState) {
	if (desiredState === "all") return true;
	if (desiredState.startsWith("!")) return state !== desiredState.substring(1);
	return state === desiredState;
}
async function findPr({ branchName, prTitle, state = "all", includeOtherAuthors }) {
	logger.debug(`findPr(${branchName}, ${prTitle}, ${state})`);
	if (includeOtherAuthors) {
		const { body: mrList } = await gitlabApi.getJsonUnchecked(`projects/${config.repository}/merge_requests?source_branch=${branchName}&state=opened`);
		if (!mrList.length) {
			logger.debug(`No MR found for branch ${branchName}`);
			return null;
		}
		return prInfo(mrList[0]);
	}
	return (await getPrList()).find((p) => p.sourceBranch === branchName && (!prTitle || p.title.toUpperCase() === prTitle.toUpperCase()) && matchesState(p.state, state)) ?? null;
}
async function getBranchPr(branchName) {
	logger.debug(`getBranchPr(${branchName})`);
	const existingPr = await findPr({
		branchName,
		state: "open"
	});
	return existingPr ? getPr(existingPr.number) : null;
}
async function getBranchStatusCheck(branchName, context) {
	const res = await getStatus(branchName, false);
	logger.debug(`Got res with ${res.length} results`);
	for (const check of res) if (check.name === context) return gitlabToRenovateStatusMapping[check.status] || "yellow";
	return null;
}
async function setBranchStatus({ branchName, context, description, state: renovateState, url: targetUrl }) {
	const branchSha = getBranchCommit(branchName);
	if (!branchSha) {
		logger.warn("Failed to get the branch commit SHA");
		return;
	}
	const url = `projects/${config.repository}/statuses/${branchSha}`;
	let state = "success";
	if (renovateState === "yellow") state = "pending";
	else if (renovateState === "red") state = "failed";
	const options = {
		state,
		description,
		context
	};
	// v8 ignore else -- TODO: add test #40625
	if (targetUrl) options.target_url = targetUrl;
	const env = getEnv();
	const retryTimes = parseInteger(env.RENOVATE_X_GITLAB_BRANCH_STATUS_CHECK_ATTEMPTS, 2);
	try {
		for (let attempt = 1; attempt <= retryTimes + 1; attempt += 1) {
			const commitUrl = `projects/${config.repository}/repository/commits/${branchSha}`;
			await gitlabApi.getJsonSafe(commitUrl, { memCache: false }, LastPipelineId).onValue((pipelineId) => {
				options.pipeline_id = pipelineId;
			});
			if (options.pipeline_id !== void 0) break;
			if (attempt >= retryTimes + 1) logger.debug(`Pipeline not yet created after ${attempt} attempts`);
			else logger.debug(`Pipeline not yet created. Retrying ${attempt}`);
			await setTimeout(parseInteger(env.RENOVATE_X_GITLAB_BRANCH_STATUS_DELAY, 1e3));
		}
	} catch (err) {
		logger.debug({ err });
		logger.warn("Failed to retrieve commit pipeline");
	}
	if (options.pipeline_id === void 0 && env.RENOVATE_X_GITLAB_SKIP_STATUS_WITHOUT_PIPELINE === "true") {
		logger.debug("Skipping branch status update because no pipeline was found");
		return;
	}
	try {
		await gitlabApi.postJson(url, { body: options });
		await getStatus(branchName, false);
	} catch (err) {
		const message = err.body?.message;
		if (isString(message) && message.startsWith("Cannot transition status via :enqueue from :pending")) logger.debug("Ignoring status transition error");
		else {
			logger.debug({ err });
			logger.warn("Failed to set branch status");
		}
	}
}
async function getIssueList() {
	// v8 ignore else -- TODO: add test #40625
	if (!config.issueList) {
		const searchParams = {
			per_page: "100",
			state: "opened"
		};
		// v8 ignore else -- TODO: add test #40625
		if (!config.ignorePrAuthor) searchParams.scope = "created_by_me";
		const query = getQueryString(searchParams);
		const res = await gitlabApi.getJsonUnchecked(`projects/${config.repository}/issues?${query}`, {
			memCache: false,
			paginate: true
		});
		/* v8 ignore next -- defensive: paginated issues endpoint always yields an array in specs */
		if (!isArray(res.body)) {
			logger.warn({ responseBody: res.body }, "Could not retrieve issue list");
			return [];
		}
		config.issueList = res.body.map((i) => ({
			iid: i.iid,
			title: i.title,
			labels: i.labels
		}));
	}
	return config.issueList;
}
async function getIssue(number, useCache = true) {
	try {
		const opts = {};
		/* v8 ignore next: temporary code */
		if (useCache) opts.cacheProvider = memCacheProvider;
		else opts.memCache = false;
		return {
			number,
			body: (await gitlabApi.getJsonUnchecked(`projects/${config.repository}/issues/${number}`, opts)).body.description
		};
	} catch (err) /* v8 ignore next -- defensive: issue fetch failures are logged and swallowed, not simulated in specs */ {
		logger.debug({
			err,
			number
		}, "Error getting issue");
		return null;
	}
}
async function findIssue(title) {
	logger.debug(`findIssue(${title})`);
	try {
		const issue = (await getIssueList()).find((i) => i.title === title);
		if (!issue) return null;
		return await getIssue(issue.iid);
	} catch /* v8 ignore next -- defensive: getIssueList/getIssue failures are swallowed, not simulated in specs */ {
		logger.warn("Error finding issue");
		return null;
	}
}
async function ensureIssue({ title, reuseTitle, body, labels, confidential }) {
	logger.debug(`ensureIssue()`);
	const description = massageMarkdown(sanitize(body));
	try {
		const issueList = await getIssueList();
		let issue = issueList.find((i) => i.title === title);
		issue ??= issueList.find((i) => i.title === reuseTitle);
		if (issue) {
			const existingDescription = (await gitlabApi.getJsonUnchecked(`projects/${config.repository}/issues/${issue.iid}`)).body.description;
			if (issue.title !== title || existingDescription !== description) {
				logger.debug("Updating issue");
				await gitlabApi.putJson(`projects/${config.repository}/issues/${issue.iid}`, { body: {
					title,
					description,
					labels: coerceArray(labels ?? issue.labels).join(","),
					confidential: confidential ?? false
				} });
				return "updated";
			}
		} else {
			await gitlabApi.postJson(`projects/${config.repository}/issues`, { body: {
				title,
				description,
				labels: coerceArray(labels).join(","),
				confidential: confidential ?? false
			} });
			logger.info("Issue created");
			delete config.issueList;
			return "created";
		}
	} catch (err) /* v8 ignore next -- issue API failures (e.g. issues disabled) are swallowed, not simulated in specs */ {
		if (err.message.startsWith("Issues are disabled for this repo")) logger.debug(`Could not create issue: ${err.message}`);
		else logger.warn({ err }, "Could not ensure issue");
	}
	return null;
}
async function ensureIssueClosing(title) {
	logger.debug(`ensureIssueClosing()`);
	const issueList = await getIssueList();
	for (const issue of issueList) if (issue.title === title) {
		logger.debug({ issue }, "Closing issue");
		await gitlabApi.putJson(`projects/${config.repository}/issues/${issue.iid}`, { body: { state_event: "close" } });
	}
}
async function addAssignees(iid, assignees) {
	try {
		logger.debug(`Adding assignees '${assignees.join(", ")}' to #${iid}`);
		const assigneeIds = [];
		for (const assignee of assignees) try {
			const userId = await getUserID(assignee);
			assigneeIds.push(userId);
		} catch (err) {
			logger.debug({
				assignee,
				err
			}, "getUserID() error");
			logger.warn({ assignee }, "Failed to add assignee - could not get ID");
		}
		const url = `projects/${config.repository}/merge_requests/${iid}?${getQueryString({ "assignee_ids[]": assigneeIds })}`;
		await gitlabApi.putJson(url);
	} catch (err) {
		logger.debug({ err }, "addAssignees error");
		logger.warn({
			iid,
			assignees
		}, "Failed to add assignees");
	}
}
async function addReviewers(iid, reviewers) {
	logger.debug(`Adding reviewers '${reviewers.join(", ")}' to #${iid}`);
	if (semver.lt(defaults.version, "13.9.0")) {
		logger.warn({ version: defaults.version }, "Adding reviewers is only available in GitLab 13.9 and onwards");
		return;
	}
	let mr;
	try {
		mr = await getMR(config.repository, iid);
	} catch (err) {
		logger.warn({ err }, "Failed to get existing reviewers");
		return;
	}
	mr.reviewers = coerceArray(mr.reviewers);
	const existingReviewers = mr.reviewers.map((r) => r.username);
	const existingReviewerIDs = mr.reviewers.map((r) => r.id);
	const newReviewers = reviewers.filter((r) => !existingReviewers.includes(r));
	let newReviewerIDs;
	newReviewerIDs = (await all(newReviewers.map((r) => async () => {
		try {
			return [await getUserID(r)];
		} catch {
			return getMemberUserIDs(r);
		}
	}))).flat();
	if (isNonEmptyArray(newReviewers) && isEmptyArray(newReviewerIDs)) {
		logger.warn("Failed to get IDs of the new reviewers");
		return;
	}
	newReviewerIDs = [...new Set(newReviewerIDs)];
	try {
		await updateMR(config.repository, iid, { reviewer_ids: [...existingReviewerIDs, ...newReviewerIDs] });
	} catch (err) {
		logger.warn({ err }, "Failed to add reviewers");
	}
}
async function deleteLabel(issueNo, label) {
	logger.debug(`Deleting label ${label} from #${issueNo}`);
	try {
		const pr = await getPr(issueNo);
		const labels = coerceArray(pr.labels).filter((l) => l !== label).join(",");
		await gitlabApi.putJson(`projects/${config.repository}/merge_requests/${issueNo}`, { body: { labels } });
	} catch (err) /* v8 ignore next -- defensive: label deletion failures are logged and swallowed, not simulated in specs */ {
		logger.warn({
			err,
			issueNo,
			label
		}, "Failed to delete label");
	}
}
async function getComments(issueNo) {
	logger.debug(`Getting comments for #${issueNo}`);
	const url = `projects/${config.repository}/merge_requests/${issueNo}/notes`;
	const comments = (await gitlabApi.getJsonUnchecked(url, { paginate: true })).body;
	logger.debug(`Found ${comments.length} comments`);
	return comments;
}
async function addComment(issueNo, body) {
	await gitlabApi.postJson(`projects/${config.repository}/merge_requests/${issueNo}/notes`, { body: { body } });
}
async function editComment(issueNo, commentId, body) {
	await gitlabApi.putJson(`projects/${config.repository}/merge_requests/${issueNo}/notes/${commentId}`, { body: { body } });
}
async function deleteComment(issueNo, commentId) {
	await gitlabApi.deleteJson(`projects/${config.repository}/merge_requests/${issueNo}/notes/${commentId}`);
}
async function ensureComment({ number, topic, content }) {
	const sanitizedContent = sanitize(content);
	const massagedTopic = topic ? topic.replace(regEx(/Pull Request/g), "Merge Request").replace(regEx(/PR/g), "MR") : topic;
	const comments = await getComments(number);
	let body;
	let commentId;
	let commentNeedsUpdating;
	if (topic) {
		logger.debug(`Ensuring comment "${massagedTopic}" in #${number}`);
		body = `### ${topic}\n\n${sanitizedContent}`;
		body = smartTruncate(body.replace(regEx(/Pull Request/g), "Merge Request").replace(regEx(/PR/g), "MR"), maxBodyLength());
		comments.forEach((comment) => {
			// v8 ignore else -- TODO: add test #40625
			if (comment.body.startsWith(`### ${massagedTopic}\n\n`)) {
				commentId = comment.id;
				commentNeedsUpdating = comment.body !== body;
			}
		});
	} else {
		logger.debug(`Ensuring content-only comment in #${number}`);
		body = smartTruncate(`${sanitizedContent}`, maxBodyLength());
		comments.forEach((comment) => {
			// v8 ignore else -- TODO: add test #40625
			if (comment.body === body) {
				commentId = comment.id;
				commentNeedsUpdating = false;
			}
		});
	}
	if (!commentId) {
		await addComment(number, body);
		logger.debug({
			repository: config.repository,
			issueNo: number
		}, "Added comment");
	} else if (commentNeedsUpdating) {
		await editComment(number, commentId, body);
		logger.debug({
			repository: config.repository,
			issueNo: number
		}, "Updated comment");
	} else logger.debug("Comment is already up-to-date");
	return true;
}
function byTopic(comment, topic) {
	return comment.body.startsWith(`### ${topic}\n\n`);
}
function byContent(comment, content) {
	return comment.body.trim() === content;
}
async function ensureCommentRemoval(deleteConfig) {
	const { number: issueNo } = deleteConfig;
	const key = deleteConfig.type === "by-topic" ? deleteConfig.topic : deleteConfig.content;
	logger.debug(`Ensuring comment "${key}" in #${issueNo} is removed`);
	const comments = await getComments(issueNo);
	let commentId = null;
	// v8 ignore else -- TODO: add test #40625
	if (deleteConfig.type === "by-topic") {
		const topic = deleteConfig.topic;
		commentId = comments.find((comment) => byTopic(comment, topic))?.id;
	} else if (deleteConfig.type === "by-content") {
		const content = deleteConfig.content;
		commentId = comments.find((comment) => byContent(comment, content))?.id;
	}
	// v8 ignore else -- TODO: add test #40625
	if (commentId) await deleteComment(issueNo, commentId);
}
async function filterUnavailableUsers(users) {
	const filteredUsers = [];
	for (const user of users) if (!await isUserBusy(user)) filteredUsers.push(user);
	return filteredUsers;
}
async function expandGroupMembers(reviewersOrAssignees) {
	const expandedReviewersOrAssignees = [];
	const normalizedReviewersOrAssigneesWithoutEmails = [];
	for (const reviewerOrAssignee of reviewersOrAssignees) {
		const roleAccessLevel = getRoleAccessLevel(reviewerOrAssignee);
		if (roleAccessLevel !== null) {
			try {
				const members = await getProjectMembersByRole(config.repository, roleAccessLevel);
				expandedReviewersOrAssignees.push(...members.map((u) => u.username));
			} catch (err) {
				logger.debug({
					err,
					reviewerOrAssignee
				}, "Unable to fetch role members");
			}
			continue;
		}
		if (reviewerOrAssignee.indexOf("@") > 0) {
			expandedReviewersOrAssignees.push(reviewerOrAssignee);
			continue;
		}
		normalizedReviewersOrAssigneesWithoutEmails.push(noLeadingAtSymbol(reviewerOrAssignee));
	}
	for (const reviewerOrAssignee of normalizedReviewersOrAssigneesWithoutEmails) try {
		const members = await getMemberUsernames(reviewerOrAssignee);
		expandedReviewersOrAssignees.push(...members);
	} catch (err) {
		if (err.statusCode !== 404) logger.debug({
			err,
			reviewerOrAssignee
		}, "Unable to fetch group");
		expandedReviewersOrAssignees.push(reviewerOrAssignee);
	}
	return expandedReviewersOrAssignees;
}
//#endregion
export { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, expandGroupMembers, extractRulesFromCodeOwnersLines, filterUnavailableUsers, findIssue, findPr, getBranchForceRebase, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, gitlab_exports, id, initPlatform, initRepo, isBranchMergeQueueEnabled, isPrInMergeQueue, labelCharLimit, massageMarkdown, maxBodyLength, mergePr, reattemptPlatformAutomerge, resetPlatform, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map