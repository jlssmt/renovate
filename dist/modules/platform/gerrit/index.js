import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { coerceObject } from "../../../util/object.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { parseJson } from "../../../util/common.js";
import { toLongCommitSha } from "../../../util/schema-utils/git.js";
import { initRepo as initRepo$1, setVirtualBranch } from "../../../util/git/index.js";
import { setBaseUrl } from "../../../util/http/gerrit.js";
import { MAX_GERRIT_COMMENT_SIZE, REQUEST_DETAILS_FOR_PRS, TAG_PULL_REQUEST_BODY, extractSourceBranch, getGerritRepoUrl, mapBranchStatusToLabel, mapGerritChangeToPr } from "./utils.js";
import { client } from "./client.js";
import { configureScm, pushForReview } from "./scm.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import readOnlyIssueBody from "../utils/read-only-issue-body.js";
import { isTruthy, isUndefined } from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/platform/gerrit/index.ts
var gerrit_exports = /* @__PURE__ */ __exportAll({
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
	updatePr: () => updatePr,
	writeToConfig: () => writeToConfig
});
const id = "gerrit";
const defaults = {};
let config = { labels: {} };
function writeToConfig(newConfig) {
	config = {
		...config,
		...newConfig
	};
}
async function initPlatform({ endpoint, username, password }) {
	logger.debug(`initPlatform(${endpoint}, ${username})`);
	if (!endpoint) throw new Error("Init: You must configure a Gerrit Server endpoint");
	if (!(username && password)) throw new Error("Init: You must configure a Gerrit Server username/password");
	config.gerritUsername = username;
	defaults.endpoint = ensureTrailingSlash(endpoint);
	setBaseUrl(defaults.endpoint);
	let gerritVersion;
	try {
		const env = getEnv();
		/* v8 ignore if: experimental feature */
		if (env.RENOVATE_X_PLATFORM_VERSION) gerritVersion = env.RENOVATE_X_PLATFORM_VERSION;
		else gerritVersion = await client.getGerritVersion({
			username,
			password
		});
	} catch (err) {
		logger.debug({ err }, "Error authenticating with Gerrit. Check your credentials");
		throw new Error("Init: Authentication failure");
	}
	logger.debug(`Gerrit version is: ${gerritVersion}`);
	const parsed = semver.parse(gerritVersion);
	if (!parsed) throw new Error(`Unable to parse Gerrit version: ${gerritVersion}`);
	gerritVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
	client.setGerritVersion(gerritVersion);
	return { endpoint: defaults.endpoint };
}
/**
* Get all state="ACTIVE" and type="CODE" repositories from gerrit
*/
async function getRepos() {
	logger.debug(`getRepos()`);
	return await client.getRepos();
}
/**
* Clone repository to local directory
* @param config
*/
async function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, gitUrl }) {
	logger.debug(`initRepo(${repository}, ${gitUrl})`);
	const projectInfo = await client.getProjectInfo(repository);
	const branchInfo = await client.getBranchInfo(repository);
	config = {
		...config,
		repository,
		head: branchInfo.revision,
		config: projectInfo,
		labels: coerceObject(projectInfo.labels)
	};
	const rejectedChanges = await client.findChanges(repository, {
		branchName: "",
		state: "open",
		label: "-2"
	});
	for (const change of rejectedChanges) {
		await client.abandonChange(change._number, "This change has been abandoned as it was voted with Code-Review -2.");
		logger.info(`Abandoned change ${change._number} with Code-Review -2 in repository ${repository}`);
	}
	const openChanges = await client.findChanges(repository, {
		branchName: "",
		state: "open",
		requestDetails: ["CURRENT_REVISION", "COMMIT_FOOTERS"]
	});
	const virtualBranches = {};
	for (const change of openChanges) {
		const branchName = extractSourceBranch(change);
		if (!branchName) continue;
		const sha = toLongCommitSha(change.current_revision);
		virtualBranches[branchName] = {
			ref: change.revisions[sha].ref,
			sha
		};
	}
	const virtualBranchCount = Object.keys(virtualBranches).length;
	if (virtualBranchCount > 0) logger.debug(`Will fetch ${virtualBranchCount} Gerrit changes as virtual branches`);
	const baseUrl = defaults.endpoint;
	const url = getGerritRepoUrl(repository, baseUrl, gitUrl, config.gerritUsername);
	configureScm(repository, config.labels);
	await initRepo$1({
		url,
		cloneSubmodules,
		cloneSubmodulesFilter,
		virtualBranches
	});
	return {
		defaultBranch: config.head,
		isFork: false,
		repoFingerprint: repoFingerprint(repository, baseUrl)
	};
}
async function findPr(findPRConfig) {
	const change = (await client.findChanges(config.repository, {
		...findPRConfig,
		singleChange: true,
		requestDetails: REQUEST_DETAILS_FOR_PRS
	})).pop();
	return change ? mapGerritChangeToPr(change, { sourceBranch: findPRConfig.branchName }) : null;
}
async function getPr(number) {
	try {
		const change = await client.getChange(number, REQUEST_DETAILS_FOR_PRS);
		return mapGerritChangeToPr(change);
	} catch (err) {
		if (err.statusCode === 404) return null;
		throw err;
	}
}
async function updatePr(prConfig) {
	logger.debug(`updatePr(${prConfig.number}, ${prConfig.prTitle})`);
	if (prConfig.prBody) await client.addMessageIfNotAlreadyExists(prConfig.number, prConfig.prBody, TAG_PULL_REQUEST_BODY);
	await client.setHashtags(prConfig.number, {
		add: prConfig.addLabels,
		remove: prConfig.removeLabels
	});
	if (prConfig.targetBranch) await client.moveChange(prConfig.number, prConfig.targetBranch);
	if (prConfig.state && prConfig.state === "closed") await client.abandonChange(prConfig.number);
}
async function createPr(prConfig) {
	logger.debug(`createPr(${prConfig.sourceBranch}, ${prConfig.prTitle}, ${prConfig.labels?.toString() ?? ""})`);
	logger.debug(`Pushing commit to refs/for/${prConfig.targetBranch} to create Gerrit change`);
	if (!await pushForReview({
		sourceRef: prConfig.sourceBranch,
		targetBranch: prConfig.targetBranch,
		files: [],
		autoApprove: prConfig.platformPrOptions?.autoApprove,
		labels: prConfig.labels ?? void 0
	})) throw new Error(`Failed to push commit to refs/for/${prConfig.targetBranch} to create Gerrit change`);
	const change = (await client.findChanges(config.repository, {
		branchName: prConfig.sourceBranch,
		targetBranch: prConfig.targetBranch,
		state: "open",
		singleChange: true,
		requestDetails: REQUEST_DETAILS_FOR_PRS
	})).pop();
	if (isUndefined(change)) throw new Error(`Could not find the Gerrit change after pushing to refs/for/${prConfig.targetBranch}`);
	const sha = toLongCommitSha(change.current_revision);
	const ref = change.revisions[sha].ref;
	await setVirtualBranch(prConfig.sourceBranch, ref, sha);
	await client.addMessage(change._number, prConfig.prBody, TAG_PULL_REQUEST_BODY);
	return mapGerritChangeToPr(change, {
		sourceBranch: prConfig.sourceBranch,
		prBody: prConfig.prBody
	});
}
async function getBranchPr(branchName, targetBranch) {
	const change = await client.getBranchChange(config.repository, {
		branchName,
		state: "open",
		targetBranch,
		requestDetails: REQUEST_DETAILS_FOR_PRS
	});
	return change ? mapGerritChangeToPr(change, { sourceBranch: branchName }) : null;
}
async function getPrList() {
	return (await client.findChanges(config.repository, {
		branchName: "",
		requestDetails: REQUEST_DETAILS_FOR_PRS
	})).map((change) => mapGerritChangeToPr(change)).filter(isTruthy);
}
async function mergePr(config) {
	logger.debug(`mergePr(${config.id}, ${config.branchName}, ${config.strategy})`);
	try {
		return (await client.submitChange(config.id)).status === "MERGED";
	} catch (err) {
		if (err.statusCode === 409) {
			logger.warn({ err }, "Can't submit the change, because the submit rule doesn't allow it.");
			return false;
		}
		throw err;
	}
}
/**
* BranchStatus for Gerrit assumes that the branchName refers to a change.
* @param branchName
*/
async function getBranchStatus(branchName) {
	logger.debug(`getBranchStatus(${branchName})`);
	const change = (await client.findChanges(config.repository, {
		state: "open",
		branchName,
		singleChange: true,
		requestDetails: [
			"LABELS",
			"SUBMITTABLE",
			"CHECK"
		]
	})).pop();
	if (change) {
		if (change.problems && change.problems.length > 0) return "red";
		if (Object.values(coerceObject(change.labels)).some((label) => label.blocking)) return "red";
		// v8 ignore else -- TODO: add test #40625
		if (change.submittable) return "green";
	}
	return "yellow";
}
/**
* check the gerrit-change for the presence of the corresponding "$context" Gerrit label if configured,
*  return 'yellow' if not configured or not set
* @param branchName
* @param context renovate/stability-days || ...
*/
async function getBranchStatusCheck(branchName, context) {
	if (config.labels[context]) {
		const change = (await client.findChanges(config.repository, {
			branchName,
			state: "open",
			singleChange: true,
			requestDetails: ["LABELS"]
		})).pop();
		// v8 ignore else -- TODO: add test #40625
		if (change) {
			const label = change.labels[context];
			// v8 ignore else -- TODO: add test #40625
			if (label) {
				if (label.rejected || label.blocking) return "red";
				// v8 ignore else -- TODO: add test #40625
				if (label.approved) return "green";
			}
		}
	}
	return "yellow";
}
/**
* Apply the branch state $context to the corresponding gerrit label (if available)
* context === "renovate/stability-days" / "renovate/merge-confidence" and state === "green"/...
* @param branchStatusConfig
*/
async function setBranchStatus(branchStatusConfig) {
	const label = config.labels[branchStatusConfig.context];
	const labelValue = label && mapBranchStatusToLabel(branchStatusConfig.state, label);
	if (branchStatusConfig.context && labelValue) {
		const change = (await client.findChanges(config.repository, {
			branchName: branchStatusConfig.branchName,
			state: "open",
			singleChange: true,
			requestDetails: ["LABELS"]
		})).pop();
		const labelKey = branchStatusConfig.context;
		if (!change?.labels || !Object.hasOwn(change.labels, labelKey)) return;
		await client.setLabel(change._number, labelKey, labelValue);
	}
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const repo = repoName ?? config.repository;
	if (!repo) {
		logger.debug("No repo so cannot getRawFile");
		return null;
	}
	// v8 ignore next -- TODO: add test #40625
	const branch = branchOrTag ?? (repo === config.repository ? config.head ?? "HEAD" : "HEAD");
	return await client.getFile(repo, branch, fileName);
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function addReviewers(number, reviewers) {
	await client.addReviewers(number, reviewers);
}
/**
* add "CC" (only one possible)
*/
async function addAssignees(number, assignees) {
	// v8 ignore else -- TODO: add test #40625
	if (assignees.length) {
		// v8 ignore else -- TODO: add test #40625
		if (assignees.length > 1) logger.debug(`addAssignees(${number}, ${assignees.toString()}) called with more then one assignee! Gerrit only supports one assignee! Using the first from list.`);
		await client.addAssignee(number, assignees[0]);
	}
}
async function ensureComment(ensureComment) {
	logger.debug(`ensureComment(${ensureComment.number}, ${ensureComment.topic}, ${ensureComment.content})`);
	await client.addMessageIfNotAlreadyExists(ensureComment.number, ensureComment.content, ensureComment.topic ?? void 0);
	return true;
}
function massageMarkdown(prBody, rebaseLabel) {
	return smartTruncate(readOnlyIssueBody(prBody), maxBodyLength()).replace("Branch creation", "Change creation").replace("close this Pull Request unmerged", "abandon or vote this change with Code-Review -2").replace("Close this PR", "Abandon or vote this change with Code-Review -2").replace("you tick the rebase/retry checkbox", `you add the _${rebaseLabel}_ hashtag to this change`).replace("checking the rebase/retry box above", `adding the _${rebaseLabel}_ hashtag to this change`).replace(regEx(/\b(?:Pull Request|PR)/g), "change").replace(regEx(/<\/?summary>/g), "**").replace(regEx(/<\/?(?:details|blockquote)>/g), "").replace(regEx(`\n---\n\n.*?<!-- rebase-check -->.*?\n`), "").replace(regEx(/<!--renovate-(?:debug|config-hash):.*?-->/g), "").replace(regEx(/&#8203;/g), "");
}
function maxBodyLength() {
	return MAX_GERRIT_COMMENT_SIZE;
}
async function deleteLabel(number, label) {
	await client.setHashtags(number, { remove: [label] });
}
function ensureCommentRemoval(_ensureCommentRemoval) {
	return Promise.resolve();
}
function ensureIssueClosing(_title) {
	return Promise.resolve();
}
function ensureIssue(_issueConfig) {
	return Promise.resolve(null);
}
function findIssue(_title) {
	return Promise.resolve(null);
}
function getIssueList() {
	return Promise.resolve([]);
}
//#endregion
export { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, gerrit_exports, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, setBranchStatus, updatePr, writeToConfig };

//# sourceMappingURL=index.js.map