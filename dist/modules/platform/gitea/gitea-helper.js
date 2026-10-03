import { logger } from "../../../logger/index.js";
import { getQueryString } from "../../../util/url.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { Comment, CommitStatus, Issue, Label, PR, Repo, RepoSearchResults, User, Version } from "./schema.js";
import { API_PATH } from "./utils.js";
import { isBoolean } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/platform/gitea/gitea-helper.ts
function urlEscape(raw) {
	return encodeURIComponent(raw);
}
const commitStatusStates = [
	"unknown",
	"success",
	"pending",
	"warning",
	"failure",
	"error"
];
async function getCurrentUser(http, options = {}) {
	const url = `${API_PATH}/user`;
	return (await http.getJson(url, options, User)).body;
}
async function getVersion(http, options = {}) {
	const url = `${API_PATH}/version`;
	return (await http.getJson(url, options, Version)).body.version;
}
async function isOrg(http, platform, organization) {
	const repoCache = getCache();
	repoCache.platform ??= {};
	const platformCache = repoCache.platform[platform] ??= {};
	platformCache.orgs ??= {};
	const cached = platformCache.orgs[organization];
	if (isBoolean(cached)) return cached;
	try {
		const url = `${API_PATH}/orgs/${organization}`;
		const res = await http.getJsonUnchecked(url);
		platformCache.orgs[organization] = res.statusCode === 200;
		return res.statusCode === 200;
	} catch (err) {
		if (err.statusCode === 404) return false;
		throw err;
	}
}
async function searchRepos(http, params, options) {
	const query = getQueryString(params);
	const url = `${API_PATH}/repos/search?${query}`;
	const res = await http.getJson(url, {
		...options,
		paginate: true
	}, RepoSearchResults);
	if (!res.body.ok) throw new Error("Unable to search for repositories, ok flag has not been set");
	return res.body.data;
}
async function orgListRepos(http, organization, options) {
	const url = `${API_PATH}/orgs/${organization}/repos`;
	return (await http.getJson(url, {
		...options,
		paginate: true
	}, z.array(Repo))).body;
}
async function getRepo(http, repoPath, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}`;
	return (await http.getJson(url, options, Repo)).body;
}
async function createPR(http, repoPath, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/pulls`;
	return (await http.postJson(url, {
		...options,
		body: params
	}, PR)).body;
}
async function updatePR(http, repoPath, idx, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/pulls/${idx}`;
	return (await http.patchJson(url, {
		...options,
		body: params
	}, PR)).body;
}
async function mergePR(http, repoPath, idx, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/pulls/${idx}/merge`;
	await http.postJson(url, {
		...options,
		body: params
	});
}
async function getPR(http, repoPath, idx, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}/pulls/${idx}`;
	return (await http.getJson(url, options, PR)).body;
}
async function getPRByBranch(http, repoPath, base, head, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}/pulls/${base}/${head}`;
	try {
		return (await http.getJson(url, options, PR)).body;
	} catch (err) {
		logger.trace({ err }, "Error while fetching PR");
		if (err.statusCode !== 404) logger.debug({ err }, "Error while fetching PR");
		return null;
	}
}
async function requestPrReviewers(http, repoPath, idx, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/pulls/${idx}/requested_reviewers`;
	await http.postJson(url, {
		...options,
		body: params
	});
}
async function createIssue(http, repoPath, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/issues`;
	return (await http.postJson(url, {
		...options,
		body: params
	}, Issue)).body;
}
async function updateIssue(http, repoPath, idx, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/issues/${idx}`;
	return (await http.patchJson(url, {
		...options,
		body: params
	}, Issue)).body;
}
async function updateIssueLabels(http, repoPath, idx, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/issues/${idx}/labels`;
	return (await http.putJson(url, {
		...options,
		body: params
	}, z.array(Label))).body;
}
async function closeIssue(http, repoPath, idx, options) {
	await updateIssue(http, repoPath, idx, {
		...options,
		state: "closed"
	});
}
async function searchIssues(http, repoPath, params, options) {
	const query = getQueryString({
		...params,
		type: "issues"
	});
	const url = `${API_PATH}/repos/${repoPath}/issues?${query}`;
	return (await http.getJson(url, {
		...options,
		paginate: true
	}, z.array(Issue))).body;
}
async function getIssue(http, repoPath, idx, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}/issues/${idx}`;
	return (await http.getJson(url, options, Issue)).body;
}
async function getRepoLabels(http, repoPath, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}/labels`;
	return (await http.getJson(url, options, z.array(Label))).body;
}
async function getOrgLabels(http, orgName, options = {}) {
	const url = `${API_PATH}/orgs/${orgName}/labels`;
	return (await http.getJson(url, options, z.array(Label))).body;
}
async function unassignLabel(http, repoPath, issue, label, options) {
	const url = `${API_PATH}/repos/${repoPath}/issues/${issue}/labels/${label}`;
	await http.deleteJson(url, options);
}
async function createComment(http, repoPath, issue, body, options) {
	const params = { body };
	const url = `${API_PATH}/repos/${repoPath}/issues/${issue}/comments`;
	return (await http.postJson(url, {
		...options,
		body: params
	}, Comment)).body;
}
async function updateComment(http, repoPath, idx, body, options) {
	const params = { body };
	const url = `${API_PATH}/repos/${repoPath}/issues/comments/${idx}`;
	return (await http.patchJson(url, {
		...options,
		body: params
	}, Comment)).body;
}
async function deleteComment(http, repoPath, idx, options) {
	const url = `${API_PATH}/repos/${repoPath}/issues/comments/${idx}`;
	await http.deleteJson(url, options);
}
async function getComments(http, repoPath, issue, options = {}) {
	const url = `${API_PATH}/repos/${repoPath}/issues/${issue}/comments`;
	return (await http.getJson(url, options, z.array(Comment))).body;
}
async function createCommitStatus(http, repoPath, branchCommit, params, options) {
	const url = `${API_PATH}/repos/${repoPath}/statuses/${branchCommit}`;
	return (await http.postJson(url, {
		...options,
		body: params
	}, CommitStatus)).body;
}
const toRenovateStatusMapping = {
	unknown: "yellow",
	success: "green",
	pending: "yellow",
	warning: "red",
	failure: "red",
	error: "red"
};
const toPlatformStatusMapping = {
	green: "success",
	yellow: "pending",
	red: "failure"
};
function filterStatus(data) {
	const ret = {};
	for (const i of data) if (!ret[i.context] || ret[i.context].id < i.id) ret[i.context] = i;
	return Object.values(ret);
}
async function getCombinedCommitStatus(http, repoPath, branchName, options) {
	const url = `${API_PATH}/repos/${repoPath}/commits/${urlEscape(branchName)}/statuses`;
	const res = await http.getJson(url, {
		...options,
		paginate: true
	}, z.array(CommitStatus));
	let worstState = 0;
	const statuses = filterStatus(res.body);
	for (const cs of statuses) worstState = Math.max(worstState, commitStatusStates.indexOf(cs.status));
	return {
		worstStatus: commitStatusStates[worstState],
		statuses
	};
}
//#endregion
export { closeIssue, createComment, createCommitStatus, createIssue, createPR, deleteComment, getCombinedCommitStatus, getComments, getCurrentUser, getIssue, getOrgLabels, getPR, getPRByBranch, getRepo, getRepoLabels, getVersion, isOrg, mergePR, orgListRepos, requestPrReviewers, searchIssues, searchRepos, toPlatformStatusMapping, toRenovateStatusMapping, unassignLabel, updateComment, updateIssue, updateIssueLabels, updatePR };

//# sourceMappingURL=gitea-helper.js.map