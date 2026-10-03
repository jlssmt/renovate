import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { REPOSITORY_NOT_FOUND } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { UUIDRegex, matchRegexOrGlobList } from "../../../util/string-match.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { getInheritedOrGlobal, parseJson } from "../../../util/common.js";
import { BitbucketHttp, setBaseUrl } from "../../../util/http/bitbucket.js";
import { RepoInfo, Repositories, UnresolvedPrTasks, WorkspaceAccesses } from "./schema.js";
import { map } from "../../../util/promises.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { getUrl, initRepo as initRepo$1 } from "../../../util/git/index.js";
import { aggressiveRepoCacheProvider, repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { REOPEN_PR_COMMENT_KEYWORD, ensureComment as ensureComment$1, ensureCommentRemoval as ensureCommentRemoval$1, reopenComments } from "./comments.js";
import { getRepoFile } from "./files.js";
import { buildStates, mergeBodyTransformer, prInfo } from "./utils.js";
import { BitbucketPrCache } from "./pr-cache.js";
import { isNonEmptyArray, isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/platform/bitbucket/index.ts
var bitbucket_exports = /* @__PURE__ */ __exportAll({
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
	resetPlatform: () => resetPlatform,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
const id = "bitbucket";
const bitbucketHttp = new BitbucketHttp();
const BITBUCKET_PROD_ENDPOINT = "https://api.bitbucket.org/";
let config = {};
function resetPlatform() {
	config = {};
	renovateUserUuid = null;
}
const defaults = { endpoint: BITBUCKET_PROD_ENDPOINT };
const pathSeparator = "/";
let renovateUserUuid = null;
async function initPlatform({ endpoint, username, password, token }) {
	if (!(username && password) && !token) throw new Error("Init: You must configure either a Bitbucket token or username and password");
	if (endpoint && endpoint !== BITBUCKET_PROD_ENDPOINT) {
		logger.warn({
			endpoint,
			defaultEndpoint: BITBUCKET_PROD_ENDPOINT
		}, "Init: Bitbucket Cloud endpoint should generally be the default but is being configured to a different value. Did you mean to use Bitbucket Server?");
		defaults.endpoint = endpoint;
	}
	setBaseUrl(defaults.endpoint);
	renovateUserUuid = null;
	const options = { memCache: false };
	if (token) options.token = token;
	else {
		options.username = username;
		options.password = password;
	}
	try {
		const { uuid } = (await bitbucketHttp.getJsonUnchecked("/2.0/user", options)).body;
		renovateUserUuid = uuid;
	} catch (err) {
		if (err.statusCode === 403 && err.body?.error?.detail?.required?.includes("account")) logger.warn(`Bitbucket: missing 'account' scope for password`);
		else logger.debug({ err }, "Unknown error fetching Bitbucket user identity");
	}
	const platformConfig = { endpoint: endpoint ?? BITBUCKET_PROD_ENDPOINT };
	return Promise.resolve(platformConfig);
}
async function getRepos(config) {
	logger.debug("Autodiscovering Bitbucket Cloud repositories");
	try {
		let workspaceSlugs;
		const autodiscoverNamespaces = config.namespaces;
		if (isNonEmptyArray(autodiscoverNamespaces)) {
			logger.debug({ autodiscoverNamespaces }, "Using configured namespaces as Bitbucket workspaces");
			workspaceSlugs = autodiscoverNamespaces;
		} else {
			logger.debug("Fetching Bitbucket workspaces for the current user");
			const { body: slugs } = await bitbucketHttp.getJson("/2.0/user/workspaces", { paginate: true }, WorkspaceAccesses);
			workspaceSlugs = slugs;
			logger.debug({ workspaceSlugs }, `Found ${workspaceSlugs.length} Bitbucket workspace(s)`);
		}
		let repos = (await map(workspaceSlugs, (workspace) => bitbucketHttp.getJson(`/2.0/repositories/${workspace}`, { paginate: true }, Repositories).then(({ body }) => body))).flat();
		const autodiscoverProjects = config.projects;
		if (isNonEmptyArray(autodiscoverProjects)) {
			logger.debug({ autodiscoverProjects: config.projects }, "Applying autodiscoverProjects filter");
			repos = repos.filter((repo) => repo.projectName && matchRegexOrGlobList(repo.projectName, autodiscoverProjects));
		}
		return repos.map(({ owner, name }) => `${owner}/${name}`);
	} catch (err) /* v8 ignore next -- defensive: repo listing failures are logged and rethrown, not simulated in specs */ {
		logger.error({ err }, `bitbucket getRepos error`);
		throw err;
	}
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const repo = repoName ?? config.repository;
	let finalBranchOrTag = branchOrTag;
	if (branchOrTag?.includes(pathSeparator)) finalBranchOrTag = await getBranchCommit(branchOrTag);
	return await getRepoFile(bitbucketHttp, repo, fileName, finalBranchOrTag, { cacheProvider: repoCacheProvider });
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter }) {
	logger.debug(`initRepo("${repository}")`);
	const opts = find({
		hostType: "bitbucket",
		url: defaults.endpoint
	});
	config = {
		repository,
		ignorePrAuthor: GlobalConfig.get("ignorePrAuthor")
	};
	let info;
	let mainBranch;
	try {
		const { body: repoInfo } = await bitbucketHttp.getJson(`/2.0/repositories/${repository}`, RepoInfo);
		info = repoInfo;
		mainBranch = info.mainbranch;
		if (getInheritedOrGlobal("bbUseDevelopmentBranch")) {
			logger.debug("bbUseDevelopmentBranch is true - Checking BitBucket's development branch");
			const developmentBranch = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${repository}/effective-branching-model`)).body.development?.name;
			if (developmentBranch) {
				mainBranch = developmentBranch;
				logger.debug(`${developmentBranch} is BitBucket's development branch - using it as default branch`);
			}
		}
		config.defaultBranch = mainBranch;
		config = {
			...config,
			owner: info.owner,
			mergeMethod: info.mergeMethod,
			is_private: info.is_private
		};
		logger.debug(`${repository} owner = ${config.owner}`);
	} catch (err) /* v8 ignore next -- initRepo error mapping (404 to not-found) is not mocked in specs */ {
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		logger.debug({ err }, "Unknown Bitbucket initRepo error");
		throw err;
	}
	const parsedEndpoint = parseUrl(defaults.endpoint);
	// v8 ignore if: endpoint is a constant
	if (!parsedEndpoint) throw new Error(`Invalid Bitbucket endpoint: ${defaults.endpoint}`);
	const { hostname } = parsedEndpoint;
	const hostnameWithoutApiPrefix = regEx(/api[.|-](?<host>.+)/).exec(hostname)?.groups?.host;
	let auth = "";
	if (opts.token) auth = `x-token-auth:${opts.token}`;
	else if (opts.password?.startsWith("ATAT")) auth = `x-bitbucket-api-token-auth:${opts.password}`;
	else auth = `${opts.username}:${opts.password}`;
	const url = getUrl({
		protocol: "https",
		auth,
		hostname: hostnameWithoutApiPrefix,
		repository
	});
	await initRepo$1({
		...config,
		url,
		cloneSubmodules,
		cloneSubmodulesFilter
	});
	return {
		defaultBranch: mainBranch,
		isFork: info.isFork,
		repoFingerprint: repoFingerprint(info.uuid, defaults.endpoint)
	};
}
/* v8 ignore next -- covered only through findPr callers, never invoked directly in specs */
function matchesState(state, desiredState) {
	if (desiredState === "all") return true;
	if (desiredState.startsWith("!")) return state !== desiredState.substring(1);
	return state === desiredState;
}
async function getPrList() {
	logger.trace("getPrList()");
	return await BitbucketPrCache.getPrs(bitbucketHttp, config.repository, renovateUserUuid);
}
async function findPr({ branchName, prTitle, state = "all", includeOtherAuthors }) {
	logger.debug(`findPr(${branchName}, ${prTitle}, ${state})`);
	if (includeOtherAuthors) {
		const prs = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/pullrequests?q=source.branch.name="${branchName}"&state=open`, { cacheProvider: memCacheProvider })).body.values;
		if (prs.length === 0) {
			logger.debug(`No PR found for branch ${branchName}`);
			return null;
		}
		return prInfo(prs[0]);
	}
	const pr = (await getPrList()).find((p) => p.sourceBranch === branchName && (!prTitle || p.title.toUpperCase() === prTitle.toUpperCase()) && matchesState(p.state, state));
	if (!pr) return null;
	logger.debug(`Found PR #${pr.number}`);
	/**
	* Bitbucket doesn't support renaming or reopening declined PRs.
	* Instead, we have to use comment-driven signals.
	*/
	if (pr.state === "closed") {
		const reopenComments$1 = await reopenComments(config, pr.number);
		if (isNonEmptyArray(reopenComments$1)) {
			if (config.is_private) {
				logger.debug(`Found '${REOPEN_PR_COMMENT_KEYWORD}' comment from workspace member. Renovate will reopen PR ${pr.number} as a new PR`);
				return null;
			}
			for (const comment of reopenComments$1) if (await isAccountMemberOfWorkspace(comment.user, config.repository)) {
				logger.debug(`Found '${REOPEN_PR_COMMENT_KEYWORD}' comment from workspace member. Renovate will reopen PR ${pr.number} as a new PR`);
				return null;
			}
		}
	}
	return pr;
}
async function getPr(prNo) {
	const pr = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/pullrequests/${prNo}`, { cacheProvider: aggressiveRepoCacheProvider })).body;
	/* v8 ignore next -- defensive: the PR endpoint returns a body or throws, never an empty body */
	if (!pr) return null;
	const res = { ...prInfo(pr) };
	if (isNonEmptyArray(pr.reviewers)) res.reviewers = pr.reviewers.map(({ uuid }) => uuid).filter(isNonEmptyString);
	return res;
}
function escapeHash(input) {
	return input?.replace(regEx(/#/g), "%23");
}
async function getBranchCommit(branchName) {
	try {
		return (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/refs/branches/${escapeHash(branchName)}`, { cacheProvider: aggressiveRepoCacheProvider })).body.target.hash;
	} catch (err) /* v8 ignore next -- defensive: missing branch is logged and mapped to undefined, not mocked in specs */ {
		logger.debug({ err }, `getBranchCommit('${branchName}') failed'`);
		return;
	}
}
async function getBranchPr(branchName) {
	logger.debug(`getBranchPr(${branchName})`);
	const existingPr = await findPr({
		branchName,
		state: "open"
	});
	return existingPr ? getPr(existingPr.number) : null;
}
async function getStatus(branchName, memCache = true) {
	const sha = await getBranchCommit(branchName);
	const opts = { paginate: true };
	/* v8 ignore next: temporary code */
	if (memCache) opts.cacheProvider = aggressiveRepoCacheProvider;
	else opts.memCache = false;
	return (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/commit/${sha}/statuses`, opts)).body.values;
}
async function getBranchStatus(branchName, internalChecksAsSuccess) {
	logger.debug(`getBranchStatus(${branchName})`);
	const statuses = await getStatus(branchName);
	logger.debug({
		branch: branchName,
		statuses
	}, "branch status check result");
	if (!statuses.length) {
		logger.debug("empty branch status check result = returning \"pending\"");
		return "yellow";
	}
	if (statuses.filter((status) => status.state === "FAILED" || status.state === "STOPPED").length) return "red";
	if (statuses.filter((status) => status.state === "INPROGRESS").length) return "yellow";
	if (!internalChecksAsSuccess && statuses.every((status) => status.state === "SUCCESSFUL" && status.key?.startsWith("renovate/"))) {
		logger.debug("Successful checks are all internal renovate/ checks, so returning \"pending\" branch status");
		return "yellow";
	}
	return "green";
}
const bbToRenovateStatusMapping = {
	SUCCESSFUL: "green",
	INPROGRESS: "yellow",
	FAILED: "red"
};
async function getBranchStatusCheck(branchName, context) {
	const bbState = (await getStatus(branchName)).find((status) => status.key === context)?.state;
	return bbToRenovateStatusMapping[bbState] || null;
}
async function setBranchStatus({ branchName, context, description, state, url: targetUrl }) {
	const sha = await getBranchCommit(branchName);
	/* v8 ignore next -- specs always pass a targetUrl, fallback exists for direct API constraints */
	const url = targetUrl ?? "https://bitbucket.org";
	const body = {
		name: context,
		state: buildStates[state],
		key: context,
		description,
		url
	};
	await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/commit/${sha}/statuses/build`, { body });
	const branchStatusesUrl = bitbucketHttp.resolveUrl(`/2.0/repositories/${config.repository}/commit/${sha}/statuses`).toString();
	aggressiveRepoCacheProvider.markSynced("get", branchStatusesUrl, false);
}
/**
* Remove or transform markdown into Bitbucket supported syntax.
*
* See https://bitbucket.org/tutorials/markdowndemo/src for supported markdown syntax
*/
function massageMarkdown(input) {
	let massaged = smartTruncate(input, maxBodyLength()).replace("you tick the rebase/retry checkbox", "by renaming this PR to start with \"rebase!\"").replace("checking the rebase/retry box above", "renaming the PR to start with \"rebase!\"").replace(regEx(/<details>\n(?:<summary>View abandoned dependencies.*<\/summary>\n\n)(?<body>[\s\S]*?)<\/details>/), "$<body>").replace(regEx(`\n---\n\n.*?<!-- rebase-check -->.*?\n`), "").replace(regEx(/\]\(\.\.\/issues\//g), "](../../issues/").replace(regEx(/\]\(\.\.\/pull\//g), "](../../pull-requests/").replace(regEx(/<!--renovate-(?:debug|config-hash):.*?-->/g), "");
	massaged = massageDetailSummaryHtmlToNestedLists(massaged);
	return massageCodeblockMarkdown(massaged);
}
/**
* Massage codeblocks indentation to ensure correct rendering in Bitbucket.
*/
function massageCodeblockMarkdown(body) {
	const codeBlockRegex = regEx(/^(?<indent>[ \t]*)```(?<lang>\w*)[^\n]*\n(?<code>[\s\S]*?)\n[ \t]*```/gm);
	let codeMatch;
	let result = body;
	while ((codeMatch = codeBlockRegex.exec(body)) !== null) {
		const { indent, lang, code } = codeMatch.groups;
		const indentLength = indent.length;
		const replacement = `\`\`\`${lang}\n${code.split("\n").map((line) => line.slice(indentLength)).join("\n")}\n\`\`\``;
		result = result.replace(codeMatch[0], replacement);
	}
	return result;
}
/**
* Massage collapsible html sections into nested unordered lists.
*
* Bitbucket doesn't currently support collapsible syntax; https://jira.atlassian.com/browse/BCLOUD-20231
*/
function massageDetailSummaryHtmlToNestedLists(body) {
	let depth = 0;
	return body.split("<details>").map((raw) => {
		const partDepth = depth;
		depth += 1;
		const countClosingDetailsTags = raw.split("</details>").length - 1;
		depth = Math.max(0, depth - countClosingDetailsTags);
		return {
			raw,
			partDepth
		};
	}).map(({ raw, partDepth }) => {
		let t = raw;
		if (partDepth === 0) return t;
		const partIndentation = "	".repeat(partDepth - 1);
		const nestedListItemIndentation = "	".repeat(partDepth);
		const rawContainsBlockquote = raw.includes("<blockquote>");
		t = t.replace(regEx(/<\/?summary>/g), partDepth === 1 ? "**" : "`");
		if (partDepth > 1) t = t.replace(regEx(/^(?<prefix>[ \t]*- [`[])/gm), `${nestedListItemIndentation}$<prefix>`);
		let result = partIndentation;
		if (rawContainsBlockquote || partDepth > 1) result += " - ";
		result += t;
		return result;
	}).join("").replace(regEx(/<\/?(?:summary|details|blockquote)>/g), "");
}
function maxBodyLength() {
	return 25e4;
}
function logIssuesRemoved() {
	logger.once.debug("Bitbucket Cloud has removed its issue tracker, so Renovate features which rely on issues, like the Dependency Dashboard, do not work. See https://developer.atlassian.com/cloud/bitbucket/changelog/#CHANGE-3071");
}
function findIssue(title) {
	logger.debug(`findIssue(${title})`);
	logIssuesRemoved();
	return Promise.resolve(null);
}
function ensureIssue({ title }) {
	logger.once.warn({ title }, "Cannot ensure issue");
	logIssuesRemoved();
	return Promise.resolve(null);
}
function getIssueList() {
	logger.debug(`getIssueList()`);
	logIssuesRemoved();
	return Promise.resolve([]);
}
function ensureIssueClosing(title) {
	logger.debug(`ensureIssueClosing(${title})`);
	logIssuesRemoved();
	return Promise.resolve();
}
function addAssignees(_prNr, _assignees) {
	logger.warn("Cannot add assignees");
	return Promise.resolve();
}
async function addReviewers(prId, reviewers) {
	logger.debug(`Adding reviewers '${reviewers.join(", ")}' to #${prId}`);
	const { title } = await getPr(prId);
	const body = {
		title,
		reviewers: reviewers.map((username) => {
			return { [username.startsWith("{") && username.endsWith("}") && UUIDRegex.test(username.slice(1, -1)) ? "uuid" : "username"]: username };
		})
	};
	await bitbucketHttp.putJson(`/2.0/repositories/${config.repository}/pullrequests/${prId}`, { body });
}
/* v8 ignore next -- stub: Bitbucket Cloud has no PR labels, callers never reach this */
function deleteLabel() {
	throw new Error("deleteLabel not implemented");
}
function ensureComment({ number, topic, content }) {
	return ensureComment$1({
		config,
		number,
		topic,
		content: sanitize(content)
	});
}
function ensureCommentRemoval(deleteConfig) {
	return ensureCommentRemoval$1(config, deleteConfig);
}
async function sanitizeReviewers(reviewers, err) {
	if (err.statusCode === 400 && err.body?.error?.fields?.reviewers) {
		const sanitizedReviewers = [];
		const MSG_AUTHOR_AND_REVIEWER = "is the author and cannot be included as a reviewer.";
		const MSG_MALFORMED_REVIEWERS_LIST = "Malformed reviewers list";
		const MSG_NOT_WORKSPACE_MEMBER = "is not a member of this workspace and cannot be added to this pull request";
		for (const msg of err.body.error.fields.reviewers) if (msg === MSG_MALFORMED_REVIEWERS_LIST) {
			logger.debug({ err }, "PR contains reviewers that may be either inactive or no longer a member of this workspace. Will try setting only active reviewers");
			for (const reviewer of reviewers) if ((await bitbucketHttp.getJsonUnchecked(`/2.0/users/${reviewer.uuid}`, { cacheProvider: aggressiveRepoCacheProvider })).body.account_status === "active" && await isAccountMemberOfWorkspace(reviewer, config.repository)) sanitizedReviewers.push(reviewer);
		} else if (msg.endsWith(MSG_NOT_WORKSPACE_MEMBER)) {
			logger.debug({ err }, "PR contains reviewer accounts which are no longer member of this workspace. Will try setting only member reviewers");
			for (const reviewer of reviewers) if (await isAccountMemberOfWorkspace(reviewer, config.repository)) sanitizedReviewers.push(reviewer);
		} else if (msg.endsWith(MSG_AUTHOR_AND_REVIEWER)) {
			logger.debug({ err }, "PR contains reviewer accounts which are also the author. Will try setting only non-author reviewers");
			const author = msg.replace(MSG_AUTHOR_AND_REVIEWER, "").trim();
			for (const reviewer of reviewers) if (reviewer.display_name !== author) sanitizedReviewers.push(reviewer);
		} else return;
		return sanitizedReviewers;
	}
}
async function isAccountMemberOfWorkspace(reviewer, repository) {
	const workspace = repository.split("/")[0];
	try {
		await bitbucketHttp.get(`/2.0/workspaces/${workspace}/members/${reviewer.uuid}`, { cacheProvider: aggressiveRepoCacheProvider });
		return true;
	} catch (err) {
		if (err.statusCode === 404) {
			logger.debug({ err }, `User ${reviewer.display_name} is not a member of the workspace ${workspace}. Will be removed from the PR`);
			return false;
		}
		throw err;
	}
}
async function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: description, draftPR = false, platformPrOptions }) {
	const base = targetBranch;
	logger.debug({
		repository: config.repository,
		title,
		base
	}, "Creating PR");
	let reviewers = [];
	if (platformPrOptions?.bbUseDefaultReviewers) reviewers = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/effective-default-reviewers`, {
		paginate: true,
		cacheProvider: aggressiveRepoCacheProvider
	})).body.values.map((reviewer) => ({
		uuid: reviewer.user.uuid,
		display_name: reviewer.user.display_name
	}));
	const body = {
		title,
		description: sanitize(description),
		source: { branch: { name: sourceBranch } },
		destination: { branch: { name: base } },
		close_source_branch: true,
		reviewers,
		draft: draftPR
	};
	try {
		const prRes = (await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/pullrequests`, { body })).body;
		const pr = prInfo(prRes);
		await BitbucketPrCache.setPr(bitbucketHttp, config.repository, renovateUserUuid, pr);
		if (platformPrOptions?.bbAutoResolvePrTasks) await autoResolvePrTasks(pr);
		return pr;
	} catch (err) /* v8 ignore next -- reviewer-sanitizing retry path depends on API error shapes not mocked in specs */ {
		const sanitizedReviewers = await sanitizeReviewers(reviewers, err);
		if (sanitizedReviewers === void 0) {
			logger.warn({ err }, "Error creating pull request");
			throw err;
		} else {
			const prRes = (await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/pullrequests`, { body: {
				...body,
				reviewers: sanitizedReviewers
			} })).body;
			const pr = prInfo(prRes);
			await BitbucketPrCache.setPr(bitbucketHttp, config.repository, renovateUserUuid, pr);
			if (platformPrOptions?.bbAutoResolvePrTasks) await autoResolvePrTasks(pr);
			return pr;
		}
	}
}
async function autoResolvePrTasks(pr) {
	logger.debug(`Auto resolve PR tasks in #${pr.number}`);
	try {
		const unResolvedTasks = (await bitbucketHttp.getJson(`/2.0/repositories/${config.repository}/pullrequests/${pr.number}/tasks`, {
			paginate: true,
			pagelen: 100
		}, UnresolvedPrTasks)).body;
		logger.trace({
			prId: pr.number,
			listTaskRes: unResolvedTasks
		}, "List PR tasks");
		for (const task of unResolvedTasks) {
			const res = await bitbucketHttp.putJson(`/2.0/repositories/${config.repository}/pullrequests/${pr.number}/tasks/${task.id}`, { body: {
				state: "RESOLVED",
				content: { raw: task.content.raw }
			} });
			logger.trace({
				prId: pr.number,
				updateTaskResponse: res
			}, "Put PR tasks - mark resolved");
		}
	} catch (err) {
		logger.warn({
			prId: pr.number,
			err
		}, "Error resolving PR tasks");
	}
}
async function updatePr({ number: prNo, prTitle: title, prBody: description, state, targetBranch }) {
	logger.debug(`updatePr(${prNo}, ${title}, body)`);
	const pr = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/pullrequests/${prNo}`)).body;
	let updatedPrRes;
	try {
		const body = {
			title,
			description: sanitize(description),
			reviewers: pr.reviewers
		};
		if (targetBranch) body.destination = { branch: { name: targetBranch } };
		updatedPrRes = (await bitbucketHttp.putJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}`, { body })).body;
	} catch (err) {
		const sanitizedReviewers = await sanitizeReviewers(pr.reviewers, err);
		if (sanitizedReviewers === void 0) throw err;
		else updatedPrRes = (await bitbucketHttp.putJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}`, { body: {
			title,
			description: sanitize(description),
			reviewers: sanitizedReviewers
		} })).body;
	}
	if (state === "closed" && pr) await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/decline`);
	await BitbucketPrCache.setPr(bitbucketHttp, config.repository, renovateUserUuid, prInfo({
		...updatedPrRes,
		...state && { state }
	}));
}
async function mergePr({ branchName, id: prNo, strategy: mergeStrategy }) {
	logger.debug(`mergePr(${prNo}, ${branchName}, ${mergeStrategy})`);
	if (mergeStrategy === "rebase") {
		logger.warn("Bitbucket Cloud does not support a \"rebase\" strategy.");
		return false;
	}
	try {
		await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/merge`, { body: mergeBodyTransformer(mergeStrategy) });
		logger.debug("Automerging succeeded");
	} catch (err) /* v8 ignore next -- defensive: merge failures are logged and mapped to false, not simulated in specs */ {
		logger.debug({ err }, `PR merge error`);
		logger.info({ pr: prNo }, "PR automerge failed");
		return false;
	}
	return true;
}
//#endregion
export { addAssignees, addReviewers, bitbucket_exports, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, resetPlatform, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map