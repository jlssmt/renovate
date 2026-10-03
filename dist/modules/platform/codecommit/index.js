import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PLATFORM_BAD_CREDENTIALS, REPOSITORY_EMPTY, REPOSITORY_NOT_FOUND } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { parseJson } from "../../../util/common.js";
import { initRepo as initRepo$1 } from "../../../util/git/index.js";
import { getNewBranchName, repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { buildCodeCommitClient, createPr as createPr$1, createPrApprovalRule, createPrComment, deleteComment, getCodeCommitUrl, getFile, getPr as getPr$1, getPrComments, getRepositoryInfo, listPullRequests, listRepositories, updateComment, updatePrDescription, updatePrStatus, updatePrTitle } from "./codecommit-client.js";
import { Buffer } from "node:buffer";
import { PullRequestStatusEnum } from "@aws-sdk/client-codecommit";
//#region lib/modules/platform/codecommit/index.ts
var codecommit_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	experimental: () => true,
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
const id = "codecommit";
const platformConfig = { endpoint: "https://git-codecommit.us-east-1.amazonaws.com" };
let config = {};
async function initPlatform({ endpoint, username, password, token: awsToken }) {
	const accessKeyId = username;
	const secretAccessKey = password;
	const env = process.env;
	let region;
	if (accessKeyId) env.AWS_ACCESS_KEY_ID = accessKeyId;
	if (secretAccessKey) env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
	if (awsToken) env.AWS_SESSION_TOKEN = awsToken;
	if (endpoint) {
		region = regEx(/.*codecommit\.(?<region>.+)\.amazonaws\.com/).exec(endpoint)?.groups?.region;
		if (region) env.AWS_REGION = region;
		else logger.warn("Can't parse region, make sure your endpoint is correct");
	}
	buildCodeCommitClient();
	await listRepositories();
	platformConfig.endpoint = endpoint ?? `https://git-codecommit.${env.AWS_REGION ?? "us-east-1"}.amazonaws.com/`;
	return { endpoint: platformConfig.endpoint };
}
async function initRepo({ repository }) {
	logger.debug(`initRepo("${repository}")`);
	config = { repository };
	let repo;
	try {
		repo = await getRepositoryInfo(repository);
	} catch (err) {
		logger.error({ err }, "Could not find repository");
		throw new Error(REPOSITORY_NOT_FOUND);
	}
	if (!repo?.repositoryMetadata) {
		logger.error({ repository }, "Could not find repository");
		throw new Error(REPOSITORY_NOT_FOUND);
	}
	logger.debug({ repositoryDetails: repo }, "Repository details");
	const metadata = repo.repositoryMetadata;
	const url = getCodeCommitUrl(metadata, repository);
	try {
		await initRepo$1({ url });
	} catch (err) {
		logger.debug({ err }, "Failed to git init");
		throw new Error(PLATFORM_BAD_CREDENTIALS);
	}
	if (!metadata.defaultBranch || !metadata.repositoryId) {
		logger.debug("Repo is empty");
		throw new Error(REPOSITORY_EMPTY);
	}
	const defaultBranch = metadata.defaultBranch;
	config.defaultBranch = defaultBranch;
	logger.debug(`${repository} default branch = ${defaultBranch}`);
	return {
		repoFingerprint: repoFingerprint(metadata.repositoryId, platformConfig.endpoint),
		defaultBranch,
		isFork: false
	};
}
async function getPrList() {
	logger.debug("getPrList()");
	if (config.prList) return config.prList;
	const listPrsResponse = await listPullRequests(config.repository);
	const fetchedPrs = [];
	if (listPrsResponse && !listPrsResponse.pullRequestIds) return fetchedPrs;
	const prIds = coerceArray(listPrsResponse.pullRequestIds);
	for (const prId of prIds) {
		const prRes = await getPr$1(prId);
		if (!prRes?.pullRequest) continue;
		const prInfo = prRes.pullRequest;
		const pr = {
			targetBranch: prInfo.pullRequestTargets[0].destinationReference,
			sourceBranch: prInfo.pullRequestTargets[0].sourceReference,
			destinationCommit: prInfo.pullRequestTargets[0].destinationCommit,
			sourceCommit: prInfo.pullRequestTargets[0].sourceCommit,
			state: prInfo.pullRequestStatus === PullRequestStatusEnum.OPEN ? "open" : "closed",
			number: Number.parseInt(prId, 10),
			title: prInfo.title,
			body: prInfo.description,
			createdAt: prInfo.creationDate?.toISOString()
		};
		fetchedPrs.push(pr);
	}
	config.prList = fetchedPrs;
	logger.debug(`Retrieved Pull Requests, count: ${fetchedPrs.length}`);
	return fetchedPrs;
}
async function findPr({ branchName, prTitle, state = "all" }) {
	let prsFiltered = [];
	try {
		const prs = await getPrList();
		const refsHeadBranchName = getNewBranchName(branchName);
		prsFiltered = prs.filter((item) => item.sourceBranch === refsHeadBranchName);
		if (prTitle) prsFiltered = prsFiltered.filter((item) => item.title.toUpperCase() === prTitle.toUpperCase());
		switch (state) {
			case "all": break;
			case "!open":
				prsFiltered = prsFiltered.filter((item) => item.state !== "open");
				break;
			default: prsFiltered = prsFiltered.filter((item) => item.state === "open");
		}
	} catch (err) {
		logger.error({ err }, "findPr error");
	}
	if (prsFiltered.length === 0) return null;
	return prsFiltered[0];
}
async function getBranchPr(branchName) {
	logger.debug(`getBranchPr(${branchName})`);
	const existingPr = await findPr({
		branchName,
		state: "open"
	});
	return existingPr ? getPr(existingPr.number) : null;
}
async function getPr(pullRequestId) {
	logger.debug(`getPr(${pullRequestId})`);
	const prRes = await getPr$1(`${pullRequestId}`);
	if (!prRes?.pullRequest) return null;
	const prInfo = prRes.pullRequest;
	let prState;
	if (prInfo.pullRequestTargets[0].mergeMetadata?.isMerged) prState = "merged";
	else prState = prInfo.pullRequestStatus === PullRequestStatusEnum.OPEN ? "open" : "closed";
	return {
		sourceBranch: prInfo.pullRequestTargets[0].sourceReference,
		sourceCommit: prInfo.pullRequestTargets[0].sourceCommit,
		state: prState,
		number: pullRequestId,
		title: prInfo.title,
		targetBranch: prInfo.pullRequestTargets[0].destinationReference,
		destinationCommit: prInfo.pullRequestTargets[0].destinationCommit,
		body: prInfo.description
	};
}
async function getRepos() {
	logger.debug("Autodiscovering AWS CodeCommit repositories");
	let reposRes;
	try {
		reposRes = await listRepositories();
	} catch (err) {
		logger.error({ err }, "Could not retrieve repositories");
		return [];
	}
	const res = [];
	const repoNames = coerceArray(reposRes?.repositories);
	for (const repo of repoNames)
 // v8 ignore else -- TODO: add test #40625
	if (repo.repositoryName) res.push(repo.repositoryName);
	return res;
}
function massageMarkdown(input) {
	return input.replace("you tick the rebase/retry checkbox", "PR is renamed to start with \"rebase!\"").replace("checking the rebase/retry box above", "renaming the PR to start with \"rebase!\"").replace(regEx(/<\/?summary>/g), "**").replace(regEx(/<\/?details>/g), "").replace(regEx(`\n---\n\n.*?<!-- rebase-check -->.*?\n`), "").replace(regEx(/\]\(\.\.\/issues\//g), "](#").replace(regEx(/\]\(\.\.\/pull\//g), "](../../pull-requests/").replace(regEx(/(?<hiddenComment><!--renovate-(?:debug|config-hash):.*?-->)/g), "[//]: # ($<hiddenComment>)");
}
/**
* Unsed, no Dashboard
*/
function maxBodyLength() {
	return Infinity;
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const fileRes = await getFile(repoName ?? config.repository, fileName, branchOrTag);
	if (!fileRes?.fileContent) return null;
	return Buffer.from(fileRes.fileContent).toString();
}
const AMAZON_MAX_BODY_LENGTH = 10239;
async function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: body }) {
	const description = smartTruncate(sanitize(body), AMAZON_MAX_BODY_LENGTH);
	const prCreateRes = await createPr$1(title, sanitize(description), sourceBranch, targetBranch, config.repository);
	if (!prCreateRes.pullRequest?.title || !prCreateRes.pullRequest?.pullRequestId || !prCreateRes.pullRequest?.description || !prCreateRes.pullRequest?.pullRequestTargets?.length) throw new Error("Could not create pr, missing PR info");
	return {
		number: Number.parseInt(prCreateRes.pullRequest.pullRequestId, 10),
		state: "open",
		title: prCreateRes.pullRequest.title,
		sourceBranch,
		targetBranch,
		sourceCommit: prCreateRes.pullRequest.pullRequestTargets[0].sourceCommit,
		destinationCommit: prCreateRes.pullRequest.pullRequestTargets[0].destinationCommit,
		sourceRepo: config.repository,
		body: prCreateRes.pullRequest.description
	};
}
async function updatePr({ number: prNo, prTitle: title, prBody: body, state }) {
	logger.debug(`updatePr(${prNo}, ${title}, body)`);
	let cachedPr = void 0;
	const cachedPrs = coerceArray(config.prList);
	for (const p of cachedPrs)
 // v8 ignore else -- TODO: add test #40625
	if (p.number === prNo) cachedPr = p;
	// v8 ignore else -- TODO: add test #40625
	if (body && cachedPr?.body !== body) await updatePrDescription(`${prNo}`, smartTruncate(sanitize(body), AMAZON_MAX_BODY_LENGTH));
	// v8 ignore else -- TODO: add test #40625
	if (title && cachedPr?.title !== title) await updatePrTitle(`${prNo}`, title);
	const prStatusInput = state === "closed" ? PullRequestStatusEnum.CLOSED : PullRequestStatusEnum.OPEN;
	// v8 ignore else -- TODO: add test #40625
	if (cachedPr?.state !== prStatusInput) try {
		await updatePrStatus(`${prNo}`, prStatusInput);
	} catch {}
}
/* v8 ignore next -- auto-merge is not supported on CodeCommit, so this stub is unexercised */
async function mergePr({ branchName, id: prNo }) {
	logger.debug(`mergePr(${prNo}, ${branchName})`);
	await getPr$1(`${prNo}`);
	return Promise.resolve(false);
}
async function addReviewers(prNo, reviewers) {
	const approvalRuleContents = `{"Version":"2018-11-08","Statements": [{"Type": "Approvers","NumberOfApprovalsNeeded":${reviewers.length},"ApprovalPoolMembers": ${JSON.stringify(reviewers)}}]}`;
	const res = await createPrApprovalRule(`${prNo}`, approvalRuleContents);
	// v8 ignore else -- TODO: add test #40625
	if (res) {
		const approvalRule = res.approvalRule;
		logger.debug({ approvalRule }, `Approval Rule Added to PR #${prNo}:`);
	}
}
/* v8 ignore next -- no-op stub: CodeCommit does not support adding assignees */
function addAssignees(_iid, _assignees) {
	return Promise.resolve();
}
/* v8 ignore next -- no-op stub: CodeCommit has no issues */
function findIssue(_title) {
	return Promise.resolve(null);
}
/* v8 ignore next -- no-op stub: CodeCommit has no issues */
function ensureIssue(_cfg) {
	return Promise.resolve(null);
}
/* v8 ignore next -- no-op stub: CodeCommit has no issues */
function getIssueList() {
	return Promise.resolve([]);
}
/* v8 ignore next -- no-op stub: CodeCommit has no issues */
function ensureIssueClosing(_title) {
	return Promise.resolve();
}
/* v8 ignore next -- no-op stub: label deletion is not implemented for CodeCommit */
function deleteLabel(_prNumber, _label) {
	return Promise.resolve();
}
/* v8 ignore next -- stub: branch statuses are not supported on CodeCommit yet, always yellow */
function getBranchStatus(branchName) {
	logger.debug(`getBranchStatus(${branchName})`);
	logger.debug("returning branch status yellow, because getBranchStatus isnt supported on aws yet");
	return Promise.resolve("yellow");
}
/* v8 ignore next -- stub: branch status checks are not supported on CodeCommit yet, always null */
function getBranchStatusCheck(branchName, context) {
	logger.debug(`getBranchStatusCheck(${branchName}, context=${context})`);
	logger.debug("returning null, because getBranchStatusCheck is not supported on aws yet");
	return Promise.resolve(null);
}
/* v8 ignore next -- no-op stub: setting branch status is not supported on CodeCommit */
function setBranchStatus(_cfg) {
	return Promise.resolve();
}
async function ensureComment({ number, topic, content }) {
	logger.debug(`ensureComment(${number}, ${topic}, content)`);
	const header = topic ? `### ${topic}\n\n` : "";
	const body = `${header}${sanitize(content)}`;
	let prCommentsResponse;
	try {
		prCommentsResponse = await getPrComments(`${number}`);
	} catch (err) {
		logger.debug({ err }, "Unable to retrieve pr comments");
		return false;
	}
	let commentId = void 0;
	let commentNeedsUpdating = false;
	if (!prCommentsResponse?.commentsForPullRequestData) return false;
	for (const commentObj of prCommentsResponse.commentsForPullRequestData) {
		if (!commentObj?.comments) continue;
		const firstCommentContent = commentObj.comments[0].content;
		if ((topic && firstCommentContent?.startsWith(header)) === true || !topic && firstCommentContent === body) {
			commentId = commentObj.comments[0].commentId;
			commentNeedsUpdating = firstCommentContent !== body;
			break;
		}
	}
	if (!commentId) {
		const thisPr = (await getPrList()).filter((item) => item.number === number);
		if (!thisPr[0].sourceCommit || !thisPr[0].destinationCommit) return false;
		await createPrComment(`${number}`, config.repository, body, thisPr[0].destinationCommit, thisPr[0].sourceCommit);
		logger.info({
			repository: config.repository,
			prNo: number,
			topic
		}, "Comment added");
	} else if (commentNeedsUpdating && commentId) {
		await updateComment(commentId, body);
		logger.debug({
			repository: config.repository,
			prNo: number,
			topic
		}, "Comment updated");
	} else logger.debug({
		repository: config.repository,
		prNo: number,
		topic
	}, "Comment is already up-to-date");
	return true;
}
async function ensureCommentRemoval(removeConfig) {
	const { number: prNo } = removeConfig;
	const key = removeConfig.type === "by-topic" ? removeConfig.topic : removeConfig.content;
	logger.debug(`Ensuring comment "${key}" in #${prNo} is removed`);
	let prCommentsResponse;
	try {
		prCommentsResponse = await getPrComments(`${prNo}`);
	} catch (err) {
		logger.debug({ err }, "Unable to retrieve pr comments");
		return;
	}
	if (!prCommentsResponse?.commentsForPullRequestData) {
		logger.debug("commentsForPullRequestData not found");
		return;
	}
	let commentIdToRemove;
	for (const commentObj of prCommentsResponse.commentsForPullRequestData) {
		if (!commentObj?.comments) {
			logger.debug("comments object not found under commentsForPullRequestData");
			continue;
		}
		for (const comment of commentObj.comments)
 // v8 ignore else -- TODO: add test #40625
		if ((removeConfig.type === "by-topic" && comment.content?.startsWith(`### ${removeConfig.topic}\n\n`)) === true || removeConfig.type === "by-content" && removeConfig.content === comment.content?.trim()) {
			commentIdToRemove = comment.commentId;
			break;
		}
		// v8 ignore else -- TODO: add test #40625
		if (commentIdToRemove) {
			await deleteComment(commentIdToRemove);
			logger.debug(`comment "${key}" in PR #${prNo} was removed`);
			break;
		}
	}
}
//#endregion
export { addAssignees, addReviewers, codecommit_exports, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map