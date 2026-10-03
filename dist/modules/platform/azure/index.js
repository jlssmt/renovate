import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { REPOSITORY_ARCHIVED, REPOSITORY_EMPTY, REPOSITORY_NOT_FOUND } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { parseJson } from "../../../util/common.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { getConfig } from "../../../config/defaults.js";
import { coreApi, getAuthenticatedUserId, gitApi, setEndpoint } from "./azure-got-wrapper.js";
import { initRepo as initRepo$1 } from "../../../util/git/index.js";
import { getNewBranchName, repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import readOnlyIssueBody from "../utils/read-only-issue-body.js";
import { getBranchNameWithoutRefsheadsPrefix, getGitStatusContextCombinedName, getGitStatusContextFromCombinedName, getRenovatePRFormat, getRepoByName, getStorageExtraCloneOpts, mapMergeStrategy, max4000Chars } from "./util.js";
import { getAllProjectTeams, getMergeMethod, getPolicyEvaluations } from "./azure-helper.js";
import { IssueService } from "./issue.js";
import { AzurePrVote } from "./types.js";
import { isString } from "@sindresorhus/is";
import { setTimeout } from "node:timers/promises";
import { GitPullRequestMergeStrategy, GitStatusState, GitVersionType, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces.js";
import { PolicyEvaluationStatus } from "azure-devops-node-api/interfaces/PolicyInterfaces.js";
//#region lib/modules/platform/azure/index.ts
var azure_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	findIssue: () => findIssue,
	findPr: () => findPr,
	getBranchPr: () => getBranchPr,
	getBranchStatus: () => getBranchStatus,
	getBranchStatusCheck: () => getBranchStatusCheck,
	getIssueList: () => getIssueList,
	getJsonFile: () => getJsonFile,
	getPr: () => getPr,
	getPrList: () => getPrList,
	getRawFile: () => getRawFile,
	getRepos: () => getRepos,
	id: () => id,
	initPlatform: () => initPlatform,
	initRepo: () => initRepo,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
let config = {};
let issueService;
let renovateUserId;
const defaults = { hostType: "azure" };
const id = "azure";
function initPlatform({ endpoint, token, username, password }) {
	if (!endpoint) throw new Error("Init: You must configure an Azure DevOps endpoint");
	if (!token && !(username && password)) throw new Error("Init: You must configure an Azure DevOps token, or a username and password");
	const res = { endpoint: ensureTrailingSlash(endpoint) };
	defaults.endpoint = res.endpoint;
	setEndpoint(res.endpoint);
	return getAuthenticatedUserId(token ? { token } : {
		username,
		password
	}).then((userId) => {
		renovateUserId = userId;
		return res;
	});
}
async function getRepos() {
	logger.debug("Autodiscovering Azure DevOps repositories");
	return (await (await gitApi()).getRepositories()).filter((repo) => repo.isDisabled !== true).map((repo) => `${repo.project?.name}/${repo.name}`);
}
async function getRawFile(fileName, repoName, branchOrTag) {
	try {
		const azureApiGit = await gitApi();
		let repoId;
		if (repoName) {
			const repos = await azureApiGit.getRepositories();
			repoId = getRepoByName(repoName, repos)?.id;
		} else repoId = config.repoId;
		if (!repoId) {
			logger.debug("No repoId so cannot getRawFile");
			return null;
		}
		let item;
		const versionDescriptor = { version: branchOrTag };
		for (const versionType of [GitVersionType.Tag, GitVersionType.Branch]) {
			versionDescriptor.versionType = versionType;
			item = await azureApiGit.getItem(repoId, fileName, void 0, void 0, void 0, void 0, void 0, void 0, branchOrTag ? versionDescriptor : void 0, true);
			if (item) break;
			else logger.debug(`File: ${fileName} not found in ${repoName} with ${versionType}: ${branchOrTag}`);
		}
		return item?.content ?? null;
	} catch (err) /* v8 ignore next -- Azure API failure modes (service unavailable, malformed items) are not mocked in specs */ {
		if (err.message?.includes("<title>Azure DevOps Services Unavailable</title>")) {
			logger.debug("Azure DevOps is currently unavailable when attempting to fetch file - throwing ExternalHostError");
			throw new ExternalHostError(err, id);
		}
		if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") throw new ExternalHostError(err, id);
		if (err.statusCode && err.statusCode >= 500 && err.statusCode < 600) throw new ExternalHostError(err, id);
		throw err;
	}
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, azureWorkItemType }) {
	logger.debug(`initRepo("${repository}")`);
	config = {
		ignorePrAuthor: GlobalConfig.get("ignorePrAuthor"),
		repository
	};
	const repos = await (await gitApi()).getRepositories();
	const repo = getRepoByName(repository, repos);
	if (!repo) {
		logger.error({
			repos,
			repo
		}, "Could not find repo in repo list");
		throw new Error(REPOSITORY_NOT_FOUND);
	}
	logger.debug({ repositoryDetails: repo }, "Repository details");
	if (repo.isDisabled) {
		logger.debug("Repository is disabled- throwing error to abort renovation");
		throw new Error(REPOSITORY_ARCHIVED);
	}
	/* v8 ignore next -- defensive: Azure omits defaultBranch only for empty repos, which abort earlier in specs */
	if (!repo.defaultBranch) {
		logger.debug("Repo is empty");
		throw new Error(REPOSITORY_EMPTY);
	}
	config.repoId = repo.id;
	config.project = repo.project.name;
	config.projectId = repo.project.id;
	config.workItemType = azureWorkItemType ?? getConfig().azureWorkItemType;
	issueService = new IssueService(config);
	config.owner = "?owner?";
	logger.debug(`${repository} owner = ${config.owner}`);
	const defaultBranch = repo.defaultBranch.replace("refs/heads/", "");
	config.defaultBranch = defaultBranch;
	logger.debug(`${repository} default branch = ${defaultBranch}`);
	config.mergeMethods = {};
	config.repoForceRebase = false;
	const [projectName, repoName] = repository.split("/");
	const opts = find({
		hostType: defaults.hostType,
		url: defaults.endpoint
	});
	const manualUrl = `${defaults.endpoint}${encodeURIComponent(projectName)}/_git/${encodeURIComponent(repoName)}`;
	const url = repo.remoteUrl ?? manualUrl;
	await initRepo$1({
		...config,
		url,
		extraCloneOpts: getStorageExtraCloneOpts(opts),
		cloneSubmodules,
		cloneSubmodulesFilter
	});
	return {
		defaultBranch,
		isFork: false,
		repoFingerprint: repoFingerprint(repo.id, defaults.endpoint)
	};
}
async function getPrList() {
	logger.debug("getPrList()");
	if (!config.prList) {
		const azureApiGit = await gitApi();
		let prs = [];
		let fetchedPrs;
		let skip = 0;
		do {
			fetchedPrs = await azureApiGit.getPullRequests(config.repoId, {
				status: PullRequestStatus.All,
				sourceRepositoryId: config.repoId,
				...!config.ignorePrAuthor && renovateUserId && { creatorId: renovateUserId }
			}, config.project, 0, skip, 100);
			prs = prs.concat(fetchedPrs);
			skip += 100;
		} while (fetchedPrs.length > 0);
		config.prList = prs.map(getRenovatePRFormat);
		logger.debug(`Retrieved Pull Requests count: ${config.prList.length}`);
	}
	return config.prList;
}
async function getPr(pullRequestId) {
	logger.debug(`getPr(${pullRequestId})`);
	if (!pullRequestId) return null;
	const azurePr = (await getPrList()).find((item) => item.number === pullRequestId);
	if (!azurePr) return null;
	azurePr.labels = (await (await gitApi()).getPullRequestLabels(config.repoId, pullRequestId)).filter((label) => label.active).map((label) => label.name).filter(isString);
	return azurePr;
}
async function findPr({ branchName, prTitle, state = "all", targetBranch, includeOtherAuthors }) {
	let prsFiltered = [];
	try {
		if (includeOtherAuthors) {
			const [pr] = await (await gitApi()).getPullRequests(config.repoId, {
				sourceRefName: getNewBranchName(branchName),
				sourceRepositoryId: config.repoId,
				status: PullRequestStatus.Active,
				...targetBranch && { targetRefName: getNewBranchName(targetBranch) }
			}, config.project, 0, 0, 1);
			return pr ? getRenovatePRFormat(pr) : null;
		}
		prsFiltered = (await getPrList()).filter((item) => item.sourceRefName === getNewBranchName(branchName));
		if (prTitle) prsFiltered = prsFiltered.filter((item) => item.title.toUpperCase() === prTitle.toUpperCase());
		switch (state) {
			case "all": break;
			case "!open":
				prsFiltered = prsFiltered.filter((item) => item.state !== "open");
				break;
			default: prsFiltered = prsFiltered.filter((item) => item.state === state);
		}
	} catch (err) {
		logger.error({ err }, "findPr error");
	}
	if (prsFiltered.length === 0) return null;
	if (targetBranch && prsFiltered.length > 1) {
		const pr = prsFiltered.find((item) => item.targetBranch === targetBranch);
		if (pr) return pr;
	}
	return prsFiltered[0];
}
async function getBranchPr(branchName, targetBranch) {
	logger.debug(`getBranchPr(${branchName}, ${targetBranch})`);
	const existingPr = await findPr({
		branchName,
		state: "open",
		targetBranch
	});
	return existingPr ? getPr(existingPr.number) : null;
}
async function getStatusCheck(branchName) {
	const azureApiGit = await gitApi();
	const branch = await azureApiGit.getBranch(config.repoId, getBranchNameWithoutRefsheadsPrefix(branchName));
	return azureApiGit.getStatuses(branch.commit.commitId, config.repoId, void 0, void 0, void 0, true);
}
const azureToRenovateStatusMapping = {
	[GitStatusState.Succeeded]: "green",
	[GitStatusState.NotApplicable]: "green",
	[GitStatusState.NotSet]: "yellow",
	[GitStatusState.Pending]: "yellow",
	[GitStatusState.PartiallySucceeded]: "yellow",
	[GitStatusState.Error]: "red",
	[GitStatusState.Failed]: "red"
};
async function getBranchStatusCheck(branchName, context) {
	const res = await getStatusCheck(branchName);
	for (const check of res) if (getGitStatusContextCombinedName(check.context) === context) return azureToRenovateStatusMapping[check.state] ?? "yellow";
	return null;
}
async function getBranchStatus(branchName, internalChecksAsSuccess) {
	logger.debug(`getBranchStatus(${branchName})`);
	const statuses = await getStatusCheck(branchName);
	logger.debug({
		branch: branchName,
		statuses
	}, "branch status check result");
	if (!statuses.length) {
		logger.debug("empty branch status check result = returning \"pending\"");
		return "yellow";
	}
	if (statuses.filter((status) => status.state === GitStatusState.Error || status.state === GitStatusState.Failed).length) return "red";
	if (statuses.filter((status) => status.state === GitStatusState.NotSet || status.state === GitStatusState.Pending).length) return "yellow";
	if (!internalChecksAsSuccess && statuses.every((status) => status.state === GitStatusState.Succeeded && status.context?.genre === "renovate")) {
		logger.debug("Successful checks are all internal renovate/ checks, so returning \"pending\" branch status");
		return "yellow";
	}
	return "green";
}
async function getMergeStrategy(targetRefName) {
	return config.mergeMethods[targetRefName] ?? (config.mergeMethods[targetRefName] = await getMergeMethod(config.repoId, config.project, targetRefName, config.defaultBranch));
}
async function getPendingBlockingPolicyEvaluations(pullRequestId) {
	const artifactId = `vstfs:///CodeReview/CodeReviewId/${config.projectId}/${pullRequestId}`;
	const policyEvaluations = await getPolicyEvaluations(config.project, artifactId);
	logger.debug({
		pullRequestId,
		artifactId,
		policyEvaluations
	}, "Retrieved policy evaluations for PR");
	return policyEvaluations.filter((evaluation) => evaluation.configuration?.isBlocking && evaluation.status !== PolicyEvaluationStatus.Approved && evaluation.status !== PolicyEvaluationStatus.NotApplicable);
}
async function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: body, labels, draftPR = false, platformPrOptions }) {
	const sourceRefName = getNewBranchName(sourceBranch);
	const targetRefName = getNewBranchName(targetBranch);
	const description = max4000Chars(sanitize(body));
	const azureApiGit = await gitApi();
	const workItemRefs = [{ id: platformPrOptions?.azureWorkItemId?.toString() }];
	let pr = await azureApiGit.createPullRequest({
		sourceRefName,
		targetRefName,
		title,
		description,
		workItemRefs,
		isDraft: draftPR
	}, config.repoId);
	if (platformPrOptions?.usePlatformAutomerge) {
		const mergeStrategy = platformPrOptions.automergeStrategy === "auto" ? await getMergeStrategy(pr.targetRefName) : mapMergeStrategy(platformPrOptions.automergeStrategy);
		const prOptions = {
			autoCompleteSetBy: { id: pr.createdBy.id },
			completionOptions: {
				mergeStrategy,
				deleteSourceBranch: true,
				mergeCommitMessage: title
			}
		};
		logger.debug({
			prOptions,
			repoId: config.repoId,
			pullRequestId: pr.pullRequestId
		}, `Updating PR ${pr.pullRequestId} to specify platformAutomerge settings`);
		pr = await azureApiGit.updatePullRequest(prOptions, config.repoId, pr.pullRequestId);
	}
	if (platformPrOptions?.autoApprove) {
		const approver = {
			reviewerUrl: pr.createdBy.url,
			vote: AzurePrVote.Approved,
			isFlagged: false,
			isRequired: false
		};
		logger.debug({
			approver,
			repoId: config.repoId,
			pullRequestId: pr.pullRequestId,
			prCreatedBy: { id: pr.createdBy.id }
		}, `Auto-approving PR ${pr.pullRequestId}`);
		await azureApiGit.createPullRequestReviewer(approver, config.repoId, pr.pullRequestId, pr.createdBy.id);
	}
	await Promise.all(labels.map((label) => azureApiGit.createPullRequestLabel({ name: label }, config.repoId, pr.pullRequestId)));
	const result = getRenovatePRFormat(pr);
	if (config.prList) config.prList.push(result);
	return result;
}
async function updatePr({ number: prNo, prTitle: title, prBody: body, state, platformPrOptions, targetBranch }) {
	logger.debug(`updatePr(${prNo}, ${title}, body)`);
	const azureApiGit = await gitApi();
	const objToUpdate = { title };
	if (targetBranch) objToUpdate.targetRefName = getNewBranchName(targetBranch);
	if (body) objToUpdate.description = max4000Chars(sanitize(body));
	if (state === "open") await azureApiGit.updatePullRequest({ status: PullRequestStatus.Active }, config.repoId, prNo);
	else if (state === "closed") objToUpdate.status = PullRequestStatus.Abandoned;
	if (platformPrOptions?.autoApprove) {
		const pr = await azureApiGit.getPullRequestById(prNo, config.project);
		await azureApiGit.createPullRequestReviewer({
			reviewerUrl: pr.createdBy.url,
			vote: AzurePrVote.Approved,
			isFlagged: false,
			isRequired: false
		}, config.repoId, pr.pullRequestId, pr.createdBy.id);
	}
	const updatedPr = await azureApiGit.updatePullRequest(objToUpdate, config.repoId, prNo);
	if (config.prList) {
		const prToCache = getRenovatePRFormat(updatedPr);
		const existingIndex = config.prList.findIndex((item) => item.number === prNo);
		/* v8 ignore next: should not happen */
		if (existingIndex === -1) {
			logger.warn({ prNo }, "PR not found in cache");
			config.prList.push(prToCache);
		} else config.prList[existingIndex] = prToCache;
	}
}
async function ensureComment({ number, topic, content }) {
	logger.debug(`ensureComment(${number}, ${topic}, content)`);
	const header = topic ? `### ${topic}\n\n` : "";
	const body = `${header}${sanitize(massageMarkdown(content))}`;
	const azureApiGit = await gitApi();
	const threads = await azureApiGit.getThreads(config.repoId, number);
	let threadIdFound;
	let commentIdFound;
	let commentNeedsUpdating = false;
	threads.forEach((thread) => {
		const firstCommentContent = thread.comments?.[0].content;
		if ((topic && firstCommentContent?.startsWith(header)) === true || !topic && firstCommentContent === body) {
			threadIdFound = thread.id;
			commentIdFound = thread.comments?.[0].id;
			commentNeedsUpdating = firstCommentContent !== body;
		}
	});
	if (!threadIdFound) {
		await azureApiGit.createThread({
			comments: [{
				content: body,
				commentType: 1,
				parentCommentId: 0
			}],
			status: 1
		}, config.repoId, number);
		logger.info({
			repository: config.repository,
			issueNo: number,
			topic
		}, "Comment added");
	} else if (commentNeedsUpdating) {
		await azureApiGit.updateComment({ content: body }, config.repoId, number, threadIdFound, commentIdFound);
		logger.debug({
			repository: config.repository,
			issueNo: number,
			topic
		}, "Comment updated");
	} else logger.debug({
		repository: config.repository,
		issueNo: number,
		topic
	}, "Comment is already up-to-date");
	return true;
}
async function ensureCommentRemoval(removeConfig) {
	const { number: issueNo } = removeConfig;
	const key = removeConfig.type === "by-topic" ? removeConfig.topic : removeConfig.content;
	logger.debug(`Ensuring comment "${key}" in #${issueNo} is removed`);
	const azureApiGit = await gitApi();
	const threads = await azureApiGit.getThreads(config.repoId, issueNo);
	let threadIdFound = null;
	if (removeConfig.type === "by-topic") threadIdFound = threads.find((thread) => !!thread.comments?.[0].content?.startsWith(`### ${removeConfig.topic}\n\n`))?.id;
	else threadIdFound = threads.find((thread) => thread.comments?.[0].content?.trim() === removeConfig.content)?.id;
	if (threadIdFound) await azureApiGit.updateThread({ status: 4 }, config.repoId, issueNo, threadIdFound);
}
const renovateToAzureStatusMapping = {
	["green"]: GitStatusState.Succeeded,
	["yellow"]: GitStatusState.Pending,
	["red"]: GitStatusState.Failed
};
async function setBranchStatus({ branchName, context, description, state, url: targetUrl }) {
	logger.debug(`setBranchStatus(${branchName}, ${context}, ${description}, ${state}, ${targetUrl})`);
	const azureApiGit = await gitApi();
	const branch = await azureApiGit.getBranch(config.repoId, getBranchNameWithoutRefsheadsPrefix(branchName));
	const statusToCreate = {
		description,
		context: getGitStatusContextFromCombinedName(context),
		state: renovateToAzureStatusMapping[state],
		targetUrl
	};
	await azureApiGit.createCommitStatus(statusToCreate, branch.commit.commitId, config.repoId);
	logger.trace(`Created commit status of ${state} on branch ${branchName}`);
}
async function mergePr({ branchName, id: pullRequestId, strategy }) {
	logger.debug(`mergePr(${pullRequestId}, ${branchName})`);
	const pendingPolicyEvaluations = await getPendingBlockingPolicyEvaluations(pullRequestId);
	if (pendingPolicyEvaluations.length) {
		logger.debug({
			pullRequestId,
			pendingPolicies: pendingPolicyEvaluations.map((evaluation) => ({
				name: evaluation.configuration?.type?.displayName,
				status: PolicyEvaluationStatus[evaluation.status]
			}))
		}, "Not completing PR because branch policies have not been satisfied yet");
		return false;
	}
	const azureApiGit = await gitApi();
	let pr = await azureApiGit.getPullRequestById(pullRequestId, config.project);
	const mergeStrategy = strategy === "auto" ? await getMergeStrategy(pr.targetRefName) : mapMergeStrategy(strategy);
	const objToUpdate = {
		status: PullRequestStatus.Completed,
		lastMergeSourceCommit: pr.lastMergeSourceCommit,
		completionOptions: {
			mergeStrategy,
			deleteSourceBranch: true,
			mergeCommitMessage: pr.title
		}
	};
	logger.trace(`Updating PR ${pullRequestId} to status ${PullRequestStatus.Completed} (${PullRequestStatus[PullRequestStatus.Completed]}) with lastMergeSourceCommit ${pr.lastMergeSourceCommit?.commitId} using mergeStrategy ${mergeStrategy} (${GitPullRequestMergeStrategy[mergeStrategy]})`);
	try {
		const response = await azureApiGit.updatePullRequest(objToUpdate, config.repoId, pullRequestId);
		let retries = 0;
		let isClosed = response.status === PullRequestStatus.Completed;
		while (!isClosed && retries < 5) {
			retries += 1;
			const sleepMs = retries * 1e3;
			logger.trace({
				pullRequestId,
				status: pr.status,
				retries
			}, `Updated PR to closed status but change has not taken effect yet. Retrying...`);
			await setTimeout(sleepMs);
			pr = await azureApiGit.getPullRequestById(pullRequestId, config.project);
			isClosed = pr.status === PullRequestStatus.Completed;
		}
		if (!isClosed) logger.warn({
			pullRequestId,
			status: pr.status,
			expectedPRStatus: PullRequestStatus[PullRequestStatus.Completed],
			actualPRStatus: PullRequestStatus[pr.status]
		}, "Expected PR to have completed status. However, the PR has a different status");
		return true;
	} catch (err) {
		logger.debug({ err }, "Failed to set the PR as completed.");
		return false;
	}
}
function massageMarkdown(input) {
	return smartTruncate(readOnlyIssueBody(input), maxBodyLength()).replace("you tick the rebase/retry checkbox", "PR is renamed to start with \"rebase!\"").replace("checking the rebase/retry box above", "renaming the PR to start with \"rebase!\"").replace(regEx(`\n---\n\n.*?<!-- rebase-check -->.*?\n`), "").replace(regEx(/<!--renovate-(?:debug|config-hash):.*?-->/g), "").replace(regEx(/\]\(\.\.\/pull\//g), "](!").replace(regEx(/(?<lead>^|[\s(])#(?<num>\d+)/g), "$<lead>!$<num>");
}
function maxBodyLength() {
	return 4e3;
}
async function findIssue(title) {
	return await issueService.findIssue(title);
}
async function ensureIssue(issueConfig) {
	return await issueService.ensureIssue(issueConfig);
}
async function ensureIssueClosing(title) {
	return await issueService.ensureIssueClosing(title);
}
async function getIssueList(titleFilter) {
	return await issueService.getIssueList(titleFilter);
}
async function getUserIds(users) {
	const azureApiGit = await gitApi();
	const azureApiCore = await coreApi();
	const repo = (await azureApiGit.getRepositories()).find((c) => c.id === config.repoId);
	const requiredReviewerPrefix = "required:";
	const validReviewers = /* @__PURE__ */ new Set();
	const teams = await getAllProjectTeams(repo.project.id);
	const members = await Promise.all(teams.map(async (t) => await azureApiCore.getTeamMembersWithExtendedProperties(repo.project.id, t.id)));
	const ids = [];
	members.forEach((listMembers) => {
		listMembers.forEach((m) => {
			users.forEach((r) => {
				let reviewer = r;
				let isRequired = false;
				if (reviewer.startsWith(requiredReviewerPrefix)) {
					reviewer = reviewer.replace(requiredReviewerPrefix, "");
					isRequired = true;
				}
				if ((reviewer.toLowerCase() === m.identity?.displayName?.toLowerCase() || reviewer.toLowerCase() === m.identity?.uniqueName?.toLowerCase()) && ids.filter((c) => c.id === m.identity?.id).length === 0) {
					ids.push({
						id: m.identity.id,
						name: reviewer,
						isRequired
					});
					validReviewers.add(reviewer);
				}
			});
		});
	});
	teams.forEach((t) => {
		users.forEach((r) => {
			let reviewer = r;
			let isRequired = false;
			if (reviewer.startsWith(requiredReviewerPrefix)) {
				reviewer = reviewer.replace(requiredReviewerPrefix, "");
				isRequired = true;
			}
			// v8 ignore else -- TODO: add test #40625
			if (reviewer.toLowerCase() === t.name?.toLowerCase() && ids.filter((c) => c.id === t.id).length === 0) {
				ids.push({
					id: t.id,
					name: reviewer,
					isRequired
				});
				validReviewers.add(reviewer);
			}
		});
	});
	for (const u of users) {
		const reviewer = u.replace(requiredReviewerPrefix, "");
		if (!validReviewers.has(reviewer)) logger.once.info(`${reviewer} is neither an Azure DevOps Team nor a user associated with a Team`);
	}
	return ids;
}
/**
*
* @param {number} issueNo
* @param {string[]} assignees
*/
async function addAssignees(issueNo, assignees) {
	logger.trace(`addAssignees(${issueNo}, [${assignees.join(", ")}])`);
	await ensureComment({
		number: issueNo,
		topic: "Add Assignees",
		content: (await getUserIds(assignees)).map((a) => `@<${a.id}>`).join(", ")
	});
}
/**
*
* @param {number} prNo
* @param {string[]} reviewers
*/
async function addReviewers(prNo, reviewers) {
	logger.trace(`addReviewers(${prNo}, [${reviewers.join(", ")}])`);
	const azureApiGit = await gitApi();
	const ids = await getUserIds(reviewers);
	await Promise.all(ids.map(async (obj) => {
		await azureApiGit.createPullRequestReviewer({ isRequired: obj.isRequired }, config.repoId, prNo, obj.id);
		logger.debug(`Reviewer added: ${obj.name}`);
	}));
}
async function deleteLabel(prNumber, label) {
	logger.debug(`Deleting label ${label} from #${prNumber}`);
	await (await gitApi()).deletePullRequestLabels(config.repoId, prNumber, label);
}
//#endregion
export { addAssignees, addReviewers, azure_exports, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map