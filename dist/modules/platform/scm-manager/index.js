import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray } from "../../../util/array.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { initRepo as initRepo$1 } from "../../../util/git/index.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { getBaseUrl, setBaseUrl } from "../../../util/http/scm-manager.js";
import { mapPrFromScmToRenovate } from "./mapper.js";
import { createScmPr, getAllRepoPrs, getAllRepos, getCurrentUser, getDefaultBranch, getRepo, getRepoPr, updateScmPr } from "./scm-manager-helper.js";
import { getRepoUrl, mapPrState, matchPrState, smartLinks } from "./utils.js";
//#region lib/modules/platform/scm-manager/index.ts
var scm_manager_exports = /* @__PURE__ */ __exportAll({
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
	invalidatePrCache: () => invalidatePrCache,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
const id = "scm-manager";
let config = {};
async function initPlatform({ endpoint, token }) {
	if (!endpoint) throw new Error("Init: SCM-Manager endpoint not configured");
	if (!token) throw new Error("Init: SCM-Manager API token not configured");
	const baseUrl = `${ensureTrailingSlash(endpoint)}api/v2`;
	setBaseUrl(baseUrl);
	try {
		const me = await getCurrentUser(token);
		const result = {
			endpoint: baseUrl,
			gitAuthor: `${me.displayName} <${me.mail}>`
		};
		logger.debug({ result }, "Platform result");
		return result;
	} catch (err) {
		logger.debug({ err }, "Init: Error authenticating with SCM-Manager. Check your token");
		throw new Error("Init: Authentication failure");
	}
}
async function initRepo({ repository, gitUrl }) {
	const repo = await getRepo(repository);
	const defaultBranch = await getDefaultBranch(repo);
	const url = getRepoUrl(repo, gitUrl, getBaseUrl());
	config = {};
	config.repository = repository;
	config.defaultBranch = defaultBranch;
	config.ignorePrAuthor = GlobalConfig.get("ignorePrAuthor");
	await initRepo$1({
		...config,
		url
	});
	invalidatePrCache();
	const result = {
		defaultBranch: config.defaultBranch,
		isFork: false,
		repoFingerprint: repoFingerprint(config.repository, getBaseUrl())
	};
	logger.debug({ result }, `Repo initialized`);
	return result;
}
async function getRepos() {
	return (await getAllRepos()).filter((repo) => repo.type === "git").map((repo) => `${repo.namespace}/${repo.name}`);
}
async function getBranchPr(branchName) {
	return await findPr({
		branchName,
		state: "open"
	});
}
async function findPr({ branchName, prTitle, state = "all" }) {
	const result = (await getPrList()).find((pr) => branchName === pr.sourceBranch && (!prTitle || prTitle === pr.title) && matchPrState(pr, state));
	if (result) {
		logger.debug({ result }, `Found PR`);
		return result;
	}
	logger.debug(`Could not find PR with source branch ${branchName} and title ${prTitle ?? ""} and state ${state}`);
	return null;
}
async function getPr(number) {
	const cachedPr = (await getPrList()).find((pr) => pr.number === number);
	if (cachedPr) {
		logger.debug("Returning from cached PRs");
		return cachedPr;
	}
	try {
		const result = await getRepoPr(config.repository, number);
		logger.debug("Returning PR from API");
		return mapPrFromScmToRenovate(result);
	} catch (err) {
		logger.error({
			err,
			number
		}, "Can not find a PR with the given id");
		return null;
	}
}
async function getPrList() {
	if (config.prList === null) try {
		config.prList = (await getAllRepoPrs(config.repository, config.ignorePrAuthor)).map((pr) => mapPrFromScmToRenovate(pr));
	} catch (error) {
		logger.error(error);
	}
	return coerceArray(config.prList);
}
async function createPr({ sourceBranch, targetBranch, prTitle, prBody, draftPR }) {
	const createdPr = await createScmPr(config.repository, {
		source: sourceBranch,
		target: targetBranch,
		title: prTitle,
		description: sanitize(prBody),
		status: draftPR ? "DRAFT" : "OPEN"
	});
	logger.debug(`PR created with title '${createdPr.title}' from source '${createdPr.source}' to target '${createdPr.target}'`);
	return mapPrFromScmToRenovate(createdPr);
}
async function updatePr({ number, prTitle, prBody, state, targetBranch }) {
	await updateScmPr(config.repository, number, {
		title: prTitle,
		description: sanitize(prBody) ?? void 0,
		target: targetBranch,
		status: mapPrState(state)
	});
	logger.debug(`Updated PR #${number} with title ${prTitle}`);
}
function mergePr(_config) {
	logger.debug("Not implemented mergePr");
	return Promise.resolve(false);
}
function getBranchStatus(_branchName, _internalChecksAsSuccess) {
	logger.debug("Not implemented getBranchStatus");
	return Promise.resolve("red");
}
function setBranchStatus(_branchStatusConfig) {
	logger.debug("Not implemented setBranchStatus");
	return Promise.resolve();
}
function getBranchStatusCheck(_branchName, _context) {
	logger.debug("Not implemented setBranchStatus");
	return Promise.resolve(null);
}
function addReviewers(_number, _reviewers) {
	logger.debug("Not implemented addReviewers");
	return Promise.resolve();
}
function addAssignees(_number, _assignees) {
	logger.debug("Not implemented addAssignees");
	return Promise.resolve();
}
function deleteLabel(_number, _label) {
	logger.debug("Not implemented deleteLabel");
	return Promise.resolve();
}
function getIssueList() {
	logger.debug("Not implemented getIssueList");
	return Promise.resolve([]);
}
function findIssue(_title) {
	logger.debug("Not implemented findIssue");
	return Promise.resolve(null);
}
function ensureIssue(_config) {
	logger.debug("Not implemented ensureIssue");
	return Promise.resolve(null);
}
function ensureIssueClosing(_title) {
	logger.debug("Not implemented ensureIssueClosing");
	return Promise.resolve();
}
function ensureComment(_config) {
	logger.debug("Not implemented ensureComment");
	return Promise.resolve(false);
}
function ensureCommentRemoval(_ensureCommentRemoval) {
	logger.debug("Not implemented ensureCommentRemoval");
	return Promise.resolve();
}
function massageMarkdown(prBody) {
	return smartTruncate(smartLinks(prBody), maxBodyLength());
}
function getRawFile(_fileName, _repoName, _branchOrTag) {
	logger.debug("Not implemented getRawFile");
	return Promise.resolve(null);
}
function getJsonFile(_fileName, _repoName, _branchOrTag) {
	logger.debug("Not implemented getJsonFile");
	return Promise.resolve(null);
}
function maxBodyLength() {
	return 2e5;
}
function invalidatePrCache() {
	config.prList = null;
}
//#endregion
export { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, invalidatePrCache, massageMarkdown, maxBodyLength, mergePr, scm_manager_exports, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map