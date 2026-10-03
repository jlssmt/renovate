import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { REPOSITORY_CHANGED, REPOSITORY_EMPTY, REPOSITORY_NOT_FOUND } from "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, getQueryString } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { parseJson } from "../../../util/common.js";
import { isEmailAdress } from "../../../util/schema-utils/index.js";
import { BitbucketServerHttp, setBaseUrl } from "../../../util/http/bitbucket-server.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { branchExists, deleteBranch, getBranchCommit, initRepo as initRepo$1 } from "../../../util/git/index.js";
import { getNewBranchName, repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { sampleSize } from "../../../util/sample.js";
import { getExtraCloneOpts, getInvalidReviewers, getRepoGitUrl, isInvalidReviewersResponse, parseModifier, prInfo, splitEscapedSpaces } from "./utils.js";
import { BbsPrCache } from "./pr-cache.js";
import { ReviewerGroups, User, Users } from "./schema.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import semver from "semver";
import { setTimeout } from "node:timers/promises";
import ignore from "ignore";
//#region lib/modules/platform/bitbucket-server/index.ts
var bitbucket_server_exports = /* @__PURE__ */ __exportAll({
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
	findIssue: () => findIssue,
	findPr: () => findPr,
	getBranchForceRebase: () => getBranchForceRebase,
	getBranchPr: () => getBranchPr,
	getBranchStatus: () => getBranchStatus,
	getBranchStatusCheck: () => getBranchStatusCheck,
	getIssueList: () => getIssueList,
	getJsonFile: () => getJsonFile,
	getPr: () => getPr,
	getPrList: () => getPrList,
	getRawFile: () => getRawFile,
	getRepos: () => getRepos,
	getUsernamesByEmail: () => getUsernamesByEmail,
	id: () => id,
	initPlatform: () => initPlatform,
	initRepo: () => initRepo,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	reattemptPlatformAutomerge: () => reattemptPlatformAutomerge,
	refreshPr: () => refreshPr,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
const id = "bitbucket-server";
let config = {};
const bitbucketServerHttp = new BitbucketServerHttp();
const defaults = {
	hostType: "bitbucket-server",
	version: "0.0.0"
};
/* v8 ignore next -- exercised only via mocked call sites, direct coverage tracked in #40625 */
function updatePrVersion(pr, version) {
	const res = Math.max(config.prVersions.get(pr) ?? 0, version);
	config.prVersions.set(pr, res);
	return res;
}
async function initPlatform({ endpoint, token, username, password, gitAuthor }) {
	if (!endpoint) throw new Error("Init: You must configure a Bitbucket Server endpoint");
	if (!(username && password) && !token) throw new Error("Init: You must either configure a Bitbucket Server username/password or a HTTP access token");
	else if (password && token) throw new Error("Init: You must configure either a Bitbucket Server password or a HTTP access token, not both");
	defaults.endpoint = ensureTrailingSlash(endpoint);
	setBaseUrl(defaults.endpoint);
	const platformConfig = { endpoint: defaults.endpoint };
	try {
		let bitbucketServerVersion = getEnv().RENOVATE_X_PLATFORM_VERSION;
		const { body, headers } = await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/application-properties`, { ...token && { token } });
		bitbucketServerVersion ??= body.version;
		if (isNonEmptyStringAndNotWhitespace(headers["x-ausername"]) && !username) {
			logger.debug({ "x-ausername": headers["x-ausername"] }, "Platform: No username configured using headers[\"x-ausername\"]");
			config.username = headers["x-ausername"];
		}
		logger.debug(`Bitbucket Server version is: ${bitbucketServerVersion}`);
		// v8 ignore else -- TODO: add test #40625
		if (semver.valid(bitbucketServerVersion)) defaults.version = bitbucketServerVersion;
	} catch (err) {
		logger.debug({ err }, "Error authenticating with Bitbucket. Check that your token includes \"api\" permissions");
	}
	if (!gitAuthor && username) {
		logger.debug(`Attempting to confirm gitAuthor from username`);
		const options = { memCache: false };
		if (token) options.token = token;
		else {
			options.username = username;
			options.password = password;
		}
		try {
			const { displayName, emailAddress } = (await bitbucketServerHttp.getJson(`./rest/api/1.0/users/${username}`, options, User)).body;
			if (!emailAddress?.length) throw new Error(`No email address configured for username ${username}`);
			platformConfig.gitAuthor = `${displayName} <${emailAddress}>`;
			logger.debug(`Detected gitAuthor: ${platformConfig.gitAuthor}`);
		} catch (err) {
			logger.debug({ err }, "Failed to get user info, fallback gitAuthor will be used");
		}
	}
	return platformConfig;
}
async function getRepos() {
	logger.debug("Autodiscovering Bitbucket Server repositories");
	try {
		const result = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/repos?permission=REPO_WRITE&state=AVAILABLE`, { paginate: true })).body.map((repo) => `${repo.project.key}/${repo.slug}`);
		logger.debug({ result }, "result of getRepos()");
		return result;
	} catch (err) /* v8 ignore next -- defensive: repo listing failures are logged and rethrown, not simulated in specs */ {
		logger.error({ err }, `bitbucket getRepos error`);
		throw err;
	}
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const [project, slug] = (repoName ?? config.repository).split("/");
	const fileUrl = `./rest/api/1.0/projects/${project}/repos/${slug}/browse/${fileName}?limit=20000${branchOrTag ? `&at=${branchOrTag}` : ""}`;
	const { isLastPage, lines, size } = (await bitbucketServerHttp.getJsonUnchecked(fileUrl)).body;
	if (isLastPage) return lines.map(({ text }) => text).join("\n");
	logger.warn({ size }, "The file is too big");
	throw new Error(`The file is too big (${size}B)`);
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, gitUrl }) {
	logger.debug(`initRepo("${JSON.stringify({ repository }, null, 2)}")`);
	const opts = find({
		hostType: defaults.hostType,
		url: defaults.endpoint
	});
	const [projectKey, repositorySlug] = repository.split("/");
	config = {
		projectKey,
		repositorySlug,
		repository,
		prVersions: /* @__PURE__ */ new Map(),
		username: opts.username,
		ignorePrAuthor: GlobalConfig.get("ignorePrAuthor")
	};
	try {
		const info = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}`)).body;
		config.owner = info.project.key;
		logger.debug(`${repository} owner = ${config.owner}`);
		const branchRes = await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/branches/default`);
		if ([204, 404].includes(branchRes.statusCode)) throw new Error(REPOSITORY_EMPTY);
		const url = getRepoGitUrl(config.repositorySlug, defaults.endpoint, gitUrl, info, opts);
		await initRepo$1({
			...config,
			url,
			extraCloneOpts: getExtraCloneOpts(opts),
			cloneSubmodules,
			cloneSubmodulesFilter,
			fullClone: semver.lte(defaults.version, "8.0.0")
		});
		config.mergeMethod = "merge";
		return {
			defaultBranch: branchRes.body.displayId,
			isFork: !!info.origin,
			repoFingerprint: repoFingerprint(info.id, defaults.endpoint)
		};
	} catch (err) /* v8 ignore next -- initRepo error mapping (404, empty repo) is not mocked in specs */ {
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		if (err.message === "empty") throw err;
		logger.debug({ err }, "Unknown Bitbucket initRepo error");
		throw err;
	}
}
async function getBranchForceRebase(_branchName) {
	const res = await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/settings/pull-requests`);
	return Boolean(res.body?.mergeConfig?.defaultStrategy?.id.includes("ff-only"));
}
async function getPr(prNo, refreshCache) {
	logger.debug(`getPr(${prNo})`);
	if (!prNo) return null;
	const opts = { memCache: false };
	if (!refreshCache) opts.cacheProvider = memCacheProvider;
	const res = await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}`, opts);
	const pr = {
		...prInfo(res.body),
		reviewers: res.body.reviewers.map((r) => r.user.name)
	};
	pr.version = updatePrVersion(pr.number, pr.version);
	return pr;
}
/* v8 ignore next -- covered only through findPr callers, direct coverage tracked in #40625 */
function matchesState(state, desiredState) {
	if (desiredState === "all") return true;
	if (desiredState.startsWith("!")) return state !== desiredState.substring(1);
	return state === desiredState;
}
/* v8 ignore next -- covered only through findPr callers, direct coverage tracked in #40625 */
function isRelevantPr(branchName, prTitle, state) {
	return (p) => p.sourceBranch === branchName && (!prTitle || p.title.toUpperCase() === prTitle.toUpperCase()) && matchesState(p.state, state);
}
async function getPrList() {
	logger.debug(`getPrList()`);
	return await BbsPrCache.getPrs(bitbucketServerHttp, config.projectKey, config.repositorySlug, config.ignorePrAuthor, config.username);
}
/* v8 ignore next -- pr-cache-backed lookup paths lack direct specs, tracked in #40625 */
async function findPr({ branchName, prTitle, state = "all", includeOtherAuthors }) {
	logger.debug(`findPr(${branchName}, "${prTitle}", "${state}")`);
	if (includeOtherAuthors) {
		const searchParams = { state: "OPEN" };
		searchParams.direction = "outgoing";
		searchParams.at = `refs/heads/${branchName}`;
		const query = getQueryString(searchParams);
		const prs = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests?${query}`, {
			paginate: true,
			limit: 1
		})).body;
		if (!prs.length) {
			logger.debug(`No PR found for branch ${branchName}`);
			return null;
		}
		return prInfo(prs[0]);
	}
	const pr = (await getPrList()).find(isRelevantPr(branchName, prTitle, state));
	if (pr) logger.debug(`Found PR #${pr.number}`);
	else logger.debug(`Renovate did not find a PR for branch ${branchName}`);
	return pr ?? null;
}
async function getBranchPr(branchName) {
	logger.debug(`getBranchPr(${branchName})`);
	const existingPr = await findPr({
		branchName,
		state: "open"
	});
	return existingPr ? getPr(existingPr.number) : null;
}
/* v8 ignore next -- real-time propagation delay helper, sleeping 1s in specs is not worthwhile */
async function refreshPr(number) {
	await setTimeout(1e3);
	await getPr(number, true);
}
async function getStatus(branchName, memCache = true) {
	const branchCommit = getBranchCommit(branchName);
	/* v8 ignore next: temporary code */
	const opts = memCache ? { cacheProvider: memCacheProvider } : { memCache: false };
	return (await bitbucketServerHttp.getJsonUnchecked(`./rest/build-status/1.0/commits/stats/${branchCommit}`, opts)).body;
}
async function getBranchStatus(branchName) {
	logger.debug(`getBranchStatus(${branchName})`);
	if (!branchExists(branchName)) {
		logger.debug("Branch does not exist - cannot fetch status");
		throw new Error(REPOSITORY_CHANGED);
	}
	try {
		const commitStatus = await getStatus(branchName);
		logger.debug({ commitStatus }, "branch status check result");
		if (commitStatus.failed > 0) return "red";
		if (commitStatus.inProgress > 0) return "yellow";
		return commitStatus.successful > 0 ? "green" : "yellow";
	} catch (err) {
		logger.warn({ err }, `Failed to get branch status`);
		return "red";
	}
}
async function getStatusCheck(branchName, memCache = true) {
	const branchCommit = getBranchCommit(branchName);
	const opts = { paginate: true };
	/* v8 ignore next: temporary code */
	if (memCache) opts.cacheProvider = memCacheProvider;
	else opts.memCache = false;
	return (await bitbucketServerHttp.getJsonUnchecked(`./rest/build-status/1.0/commits/${branchCommit}`, opts)).body;
}
async function getBranchStatusCheck(branchName, context) {
	logger.debug(`getBranchStatusCheck(${branchName}, context=${context})`);
	try {
		const states = await getStatusCheck(branchName);
		for (const state of states) if (state.key === context) switch (state.state) {
			case "SUCCESSFUL": return "green";
			case "INPROGRESS": return "yellow";
			default: return "red";
		}
	} catch (err) {
		logger.warn({ err }, `Failed to check branch status`);
	}
	return null;
}
async function setBranchStatus({ branchName, context, description, state, url: targetUrl }) {
	logger.debug(`setBranchStatus(${branchName})`);
	if (await getBranchStatusCheck(branchName, context) === state) return;
	logger.debug({
		branch: branchName,
		context,
		state
	}, "Setting branch status");
	const branchCommit = getBranchCommit(branchName);
	try {
		const body = {
			key: context,
			description,
			url: targetUrl ?? "https://renovatebot.com"
		};
		switch (state) {
			case "green":
				body.state = "SUCCESSFUL";
				break;
			case "yellow":
				body.state = "INPROGRESS";
				break;
			default: body.state = "FAILED";
		}
		await bitbucketServerHttp.postJson(`./rest/build-status/1.0/commits/${branchCommit}`, { body });
		await getStatus(branchName, false);
		await getStatusCheck(branchName, false);
	} catch (err) {
		logger.warn({ err }, `Failed to set branch status`);
	}
}
/* v8 ignore next -- no-op stub: Bitbucket Server has no issues */
function findIssue(title) {
	logger.debug(`findIssue(${title})`);
	return Promise.resolve(null);
}
/* v8 ignore next -- no-op stub: Bitbucket Server has no issues */
function ensureIssue({ title }) {
	logger.warn({ title }, "Cannot ensure issue");
	return Promise.resolve(null);
}
/* v8 ignore next -- no-op stub: Bitbucket Server has no issues */
function getIssueList() {
	logger.debug(`getIssueList()`);
	return Promise.resolve([]);
}
/* v8 ignore next -- no-op stub: Bitbucket Server has no issues */
function ensureIssueClosing(title) {
	logger.debug(`ensureIssueClosing(${title})`);
	return Promise.resolve();
}
function addAssignees(iid, assignees) {
	logger.debug(`addAssignees(${iid}, [${assignees.join(", ")}])`);
	return Promise.resolve();
}
async function addReviewers(prNo, reviewers) {
	logger.debug(`Adding reviewers '${reviewers.join(", ")}' to #${prNo}`);
	const reviewerNames = /* @__PURE__ */ new Set();
	for (const entry of reviewers) if (isEmailAdress(entry)) {
		const names = await getUsernamesByEmail(entry);
		for (const name of names) reviewerNames.add(name);
	} else reviewerNames.add(entry);
	await retry(updatePRAndAddReviewers, [prNo, Array.from(reviewerNames)], 3, [REPOSITORY_CHANGED]);
}
/**
* Resolves Bitbucket users by email address,
* restricted to users who have REPO_READ permission on the target repository.
*
* @param emailAddress - A string that could be the user's email address.
* @returns List of usernames for active, matched users.
*/
async function getUsernamesByEmail(emailAddress) {
	try {
		const filterUrl = `./rest/api/1.0/users?filter=${emailAddress}&permission.1=REPO_READ&permission.1.projectKey=${config.projectKey}&permission.1.repositorySlug=${config.repositorySlug}`;
		const users = await bitbucketServerHttp.getJson(filterUrl, {
			paginate: true,
			limit: 100
		}, Users);
		if (users.body.length) return users.body.filter((u) => u.active && u.emailAddress === emailAddress).map((u) => u.name);
	} catch (err) {
		logger.warn({
			err,
			emailAddress
		}, `Failed to resolve email address to username`);
		throw err;
	}
	logger.debug({ userinfo: emailAddress }, "No users found for email-address");
	return [];
}
async function updatePRAndAddReviewers(prNo, reviewers) {
	try {
		const pr = await getPr(prNo);
		if (!pr) throw new Error(REPOSITORY_NOT_FOUND);
		const reviewersSet = /* @__PURE__ */ new Set([...pr.reviewers, ...reviewers]);
		await bitbucketServerHttp.putJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}`, { body: {
			title: pr.title,
			version: pr.version,
			reviewers: Array.from(reviewersSet).map((name) => ({ user: { name } }))
		} });
		await getPr(prNo, true);
	} catch (err) {
		logger.warn({
			err,
			reviewers,
			prNo
		}, `Failed to add reviewers`);
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		else if (err.statusCode === 409) {
			if (isInvalidReviewersResponse(err)) {
				const invalidReviewers = getInvalidReviewers(err);
				const filteredReviewers = reviewers.filter((name) => !invalidReviewers.includes(name));
				if (filteredReviewers.length < reviewers.length) await updatePRAndAddReviewers(prNo, filteredReviewers);
				else {
					logger.warn({
						invalidReviewers,
						reviewers
					}, "Could not filter invalid reviewers from list, aborting to prevent infinite recursion");
					throw err;
				}
			} else {
				logger.debug("409 response to adding reviewers - has repository changed?");
				throw new Error(REPOSITORY_CHANGED);
			}
		} else throw err;
	}
}
async function retry(fn, args, maxTries, retryErrorMessages) {
	const maxAttempts = Math.max(maxTries, 1);
	let lastError;
	for (let attempt = 0; attempt < maxAttempts; attempt++) try {
		return await fn(...args);
	} catch (e) {
		lastError = e;
		if (retryErrorMessages.length !== 0 && !retryErrorMessages.includes(e.message)) {
			logger.debug(`Error not marked for retry`);
			throw e;
		}
	}
	logger.debug(`All ${maxAttempts} retry attempts exhausted`);
	throw lastError;
}
function deleteLabel(issueNo, label) {
	logger.debug(`deleteLabel(${issueNo}, ${label})`);
	return Promise.resolve();
}
async function getComments(prNo) {
	const comments = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/activities`, { paginate: true })).body.filter((a) => a.action === "COMMENTED" && "comment" in a && "commentAction" in a).filter((a) => a.commentAction === "ADDED").map((a) => a.comment);
	logger.debug(`Found ${comments.length} comments`);
	return comments;
}
async function addComment(prNo, text) {
	await bitbucketServerHttp.postJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/comments`, { body: { text } });
}
async function getCommentVersion(prNo, commentId) {
	const { version } = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/comments/${commentId}`)).body;
	return version;
}
async function editComment(prNo, commentId, text) {
	const version = await getCommentVersion(prNo, commentId);
	await bitbucketServerHttp.putJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/comments/${commentId}`, { body: {
		text,
		version
	} });
}
async function deleteComment(prNo, commentId) {
	const version = await getCommentVersion(prNo, commentId);
	await bitbucketServerHttp.deleteJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/comments/${commentId}?version=${version}`);
}
async function ensureComment({ number, topic, content }) {
	const sanitizedContent = sanitize(content);
	try {
		const comments = await getComments(number);
		let body;
		let commentId;
		let commentNeedsUpdating;
		if (topic) {
			logger.debug(`Ensuring comment "${topic}" in #${number}`);
			body = `### ${topic}\n\n${sanitizedContent}`;
			comments.forEach((comment) => {
				if (comment.text.startsWith(`### ${topic}\n\n`)) {
					commentId = comment.id;
					commentNeedsUpdating = comment.text !== body;
				}
			});
		} else {
			logger.debug(`Ensuring content-only comment in #${number}`);
			body = `${sanitizedContent}`;
			comments.forEach((comment) => {
				if (comment.text === body) {
					commentId = comment.id;
					commentNeedsUpdating = false;
				}
			});
		}
		if (!commentId) {
			await addComment(number, body);
			logger.info({
				repository: config.repository,
				prNo: number,
				topic
			}, "Comment added");
		} else if (commentNeedsUpdating) {
			await editComment(number, commentId, body);
			logger.debug({
				repository: config.repository,
				prNo: number
			}, "Comment updated");
		} else logger.debug("Comment is already up-to-date");
		return true;
	} catch (err) /* v8 ignore next -- defensive: comment API failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Error ensuring comment");
		return false;
	}
}
function byTopic(comment, topic) {
	return comment.text.startsWith(`### ${topic}\n\n`);
}
function byContent(comment, content) {
	return comment.text.trim() === content;
}
async function ensureCommentRemoval(deleteConfig) {
	try {
		const { number: prNo } = deleteConfig;
		const key = deleteConfig.type === "by-topic" ? deleteConfig.topic : deleteConfig.content;
		logger.debug(`Ensuring comment "${key}" in #${prNo} is removed`);
		const comments = await getComments(prNo);
		let commentId = null;
		// v8 ignore else -- TODO: add test #40625
		if (deleteConfig.type === "by-topic") {
			const topic = deleteConfig.topic;
			commentId = comments.find((comment) => byTopic(comment, topic))?.id;
		} else if (deleteConfig.type === "by-content") {
			const content = deleteConfig.content;
			commentId = comments.find((comment) => byContent(comment, content))?.id;
		}
		if (commentId) await deleteComment(prNo, commentId);
	} catch (err) /* v8 ignore next -- defensive: comment API failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Error ensuring comment removal");
	}
}
function escapeHash(input) {
	return input?.replace(regEx(/#/g), "%23");
}
async function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: rawDescription, platformPrOptions }) {
	const description = sanitize(rawDescription);
	logger.debug(`createPr(${sourceBranch}, title=${title})`);
	const base = targetBranch;
	let reviewers = [];
	if (platformPrOptions?.bbUseDefaultReviewers) {
		logger.debug(`fetching default reviewers`);
		const { id } = (await bitbucketServerHttp.getJsonUnchecked(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}`)).body;
		reviewers = (await bitbucketServerHttp.getJsonUnchecked(`./rest/default-reviewers/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/reviewers?sourceRefId=refs/heads/${escapeHash(sourceBranch)}&targetRefId=refs/heads/${base}&sourceRepoId=${id}&targetRepoId=${id}`)).body.map((u) => ({ user: { name: u.name } }));
	}
	const body = {
		title,
		description,
		fromRef: { id: `refs/heads/${sourceBranch}` },
		toRef: { id: `refs/heads/${base}` },
		reviewers
	};
	let prInfoRes;
	try {
		prInfoRes = await bitbucketServerHttp.postJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests`, { body });
	} catch (err) /* v8 ignore next -- EmptyPullRequestException handling is not mocked in specs */ {
		if (err.body?.errors?.[0]?.exceptionName === "com.atlassian.bitbucket.pull.EmptyPullRequestException") {
			logger.debug("Empty pull request - deleting branch so it can be recreated next run");
			await deleteBranch(sourceBranch);
			throw new Error(REPOSITORY_CHANGED);
		}
		throw err;
	}
	const pr = { ...prInfo(prInfoRes.body) };
	updatePrVersion(pr.number, pr.version);
	await BbsPrCache.setPr(bitbucketServerHttp, config.projectKey, config.repositorySlug, config.ignorePrAuthor, config.username, pr);
	await tryPrAutomerge(pr.number, pr.version, platformPrOptions);
	return pr;
}
async function reattemptPlatformAutomerge({ number, platformPrOptions }) {
	logger.debug(`reattemptPlatformAutomerge(${number})`);
	try {
		const pr = await getPr(number, true);
		if (!pr) throw new Error(REPOSITORY_NOT_FOUND);
		await tryPrAutomerge(pr.number, pr.version, platformPrOptions);
		logger.debug(`PR platform automerge re-attempted...prNo: ${number}`);
	} catch (err) {
		logger.warn({ err }, "Error re-attempting PR platform automerge");
	}
}
async function updatePr({ number: prNo, prTitle: title, prBody: rawDescription, state, bitbucketInvalidReviewers, targetBranch }) {
	const description = sanitize(rawDescription);
	logger.debug(`updatePr(${prNo}, title=${title})`);
	try {
		const pr = await getPr(prNo);
		if (!pr) throw Object.assign(new Error(REPOSITORY_NOT_FOUND), { statusCode: 404 });
		const body = {
			title,
			description,
			version: pr.version,
			reviewers: pr.reviewers?.filter((name) => !bitbucketInvalidReviewers?.includes(name)).map((name) => ({ user: { name } }))
		};
		if (targetBranch) body.toRef = { id: getNewBranchName(targetBranch) };
		const { body: updatedPr } = await bitbucketServerHttp.putJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}`, { body });
		updatePrVersion(prNo, updatedPr.version);
		const currentState = updatedPr.state;
		const newState = {
			["open"]: "OPEN",
			["closed"]: "DECLINED"
		}[state];
		let finalState = currentState === "OPEN" ? "open" : "closed";
		if (newState && ["OPEN", "DECLINED"].includes(currentState) && currentState !== newState) {
			const command = state === "open" ? "reopen" : "decline";
			const { body: updatedStatePr } = await bitbucketServerHttp.postJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${pr.number}/${command}?version=${updatedPr.version}`);
			finalState = state;
			updatePrVersion(pr.number, updatedStatePr.version);
		}
		const bbsPr = prInfo(updatedPr);
		await BbsPrCache.setPr(bitbucketServerHttp, config.projectKey, config.repositorySlug, config.ignorePrAuthor, config.username, {
			...bbsPr,
			state: finalState
		});
	} catch (err) {
		logger.debug({
			err,
			prNo
		}, `Failed to update PR`);
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		else if (err.statusCode === 409) {
			if (isInvalidReviewersResponse(err) && !bitbucketInvalidReviewers) await updatePr({
				number: prNo,
				prTitle: title,
				prBody: rawDescription,
				state,
				bitbucketInvalidReviewers: getInvalidReviewers(err)
			});
			else throw new Error(REPOSITORY_CHANGED);
		} else throw err;
	}
}
async function mergePr({ branchName, id: prNo }) {
	logger.debug(`mergePr(${prNo}, ${branchName})`);
	try {
		const pr = await getPr(prNo);
		if (!pr) throw Object.assign(new Error(REPOSITORY_NOT_FOUND), { statusCode: 404 });
		const { body } = await bitbucketServerHttp.postJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNo}/merge?version=${pr.version}`);
		updatePrVersion(prNo, body.version);
	} catch (err) {
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		else if (err.statusCode === 409) {
			logger.warn({ err }, `Failed to merge PR`);
			return false;
		} else {
			logger.warn({ err }, `Failed to merge PR`);
			return false;
		}
	}
	logger.debug(`PR merged, PrNo:${prNo}`);
	return true;
}
/**
* Enables Bitbucket Server-native automerge for the given PR.
* https://confluence.atlassian.com/bitbucketserver094/merge-a-pull-request-1489802114.html#Mergeapullrequest-Auto-mergeapullrequest
*/
async function tryPrAutomerge(prNumber, prVersion, platformPrOptions) {
	if (!platformPrOptions?.usePlatformAutomerge) return;
	logger.debug(`tryPrAutomerge(${prNumber})`);
	if (semver.lt(defaults.version, "8.15.0")) {
		logger.debug({ prNumber }, "Bitbucket Server-native automerge: not supported on this version of Bitbucket. Use 8.15.0 or newer.");
		return;
	}
	try {
		await bitbucketServerHttp.postJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/pull-requests/${prNumber}/merge?version=${prVersion}`, { body: { autoMerge: true } });
		logger.debug({ prNumber }, "Bitbucket Server-native automerge: success");
	} catch (err) {
		logger.warn({
			err,
			prNumber
		}, "Bitbucket Server-native automerge: fail");
	}
}
async function expandGroupMembers(reviewers) {
	logger.debug(`expandGroupMembers(${reviewers.join(", ")})`);
	const expandedUsers = [];
	const reviewerGroupPrefix = "@reviewer-group/";
	for (const reviewer of reviewers) {
		const [baseEntry, modifier] = reviewer.split(":");
		if (baseEntry.startsWith(reviewerGroupPrefix)) {
			const groupUsers = await getUsersFromReviewerGroup(baseEntry.replace(reviewerGroupPrefix, ""));
			if (!groupUsers.length) continue;
			if (modifier) {
				const randomCount = parseModifier(modifier);
				if (randomCount) {
					expandedUsers.push(...sampleSize(groupUsers, randomCount));
					continue;
				}
			}
			expandedUsers.push(...groupUsers);
		} else expandedUsers.push(baseEntry);
	}
	return [...new Set(expandedUsers)];
}
function extractRulesFromCodeOwnersLines(cleanedLines) {
	const results = [];
	const reversedLines = cleanedLines.filter((line) => line.trim() !== "" && !line.trim().startsWith("#")).reverse();
	for (const line of reversedLines) {
		const [pattern, ...entries] = splitEscapedSpaces(line);
		const matcher = ignore().add(pattern);
		results.push({
			pattern,
			usernames: [...new Set(entries)],
			score: pattern.length,
			match: (path) => matcher.ignores(path)
		});
	}
	return results;
}
async function getUsersFromReviewerGroup(groupName) {
	const allGroups = [];
	try {
		const reviewerGroups = await bitbucketServerHttp.getJson(`./rest/api/1.0/projects/${config.projectKey}/repos/${config.repositorySlug}/settings/reviewer-groups`, { paginate: true }, ReviewerGroups);
		allGroups.push(...reviewerGroups.body);
	} catch (err) {
		logger.debug({
			err,
			groupName
		}, "Failed to get reviewer groups for repo");
		return [];
	}
	const repoGroup = allGroups.find((group) => group.name === groupName && group.scope?.type === "REPOSITORY");
	if (repoGroup) return repoGroup.users.filter((user) => user.active).map((user) => user.name);
	const projectGroup = allGroups.find((group) => group.name === groupName && group.scope?.type === "PROJECT");
	if (projectGroup) return projectGroup.users.filter((user) => user.active).map((user) => user.name);
	logger.warn({ groupName }, "Reviewer group not found at repo or project level");
	return [];
}
function massageMarkdown(input) {
	logger.debug(`massageMarkdown(${input.split(newlineRegex)[0]})`);
	return smartTruncate(input, maxBodyLength()).replace("you tick the rebase/retry checkbox", "PR is renamed to start with \"rebase!\"").replace("checking the rebase/retry box above", "renaming the PR to start with \"rebase!\"").replace(regEx(/<\/?summary>/g), "**").replace(regEx(/<\/?details>/g), "").replace(regEx(`\n---\n\n.*?<!-- rebase-check -->.*?(\n|$)`), "").replace(regEx(/<!--.*?-->/gs), "").replace(regEx(/(?<badge>!\[.+?\]\(https:\/\/developer\.mend\.io\/api\/mc\/badges\/.+?\))/g), "$<badge>{height=20}");
}
function maxBodyLength() {
	return 3e4;
}
//#endregion
export { addAssignees, addReviewers, bitbucket_server_exports, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, expandGroupMembers, extractRulesFromCodeOwnersLines, findIssue, findPr, getBranchForceRebase, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, getUsernamesByEmail, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, reattemptPlatformAutomerge, refreshPr, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map