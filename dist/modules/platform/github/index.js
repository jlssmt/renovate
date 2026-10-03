import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PLATFORM_UNKNOWN_ERROR, PR_ALREADY_IN_MERGE_QUEUE, REPOSITORY_ACCESS_FORBIDDEN, REPOSITORY_ARCHIVED, REPOSITORY_BLOCKED, REPOSITORY_CANNOT_FORK, REPOSITORY_CHANGED, REPOSITORY_EMPTY, REPOSITORY_FORKED, REPOSITORY_FORK_MISSING, REPOSITORY_NOT_FOUND, REPOSITORY_RENAMED } from "../../../constants/error-messages.js";
import { coerceObject } from "../../../util/object.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray } from "../../../util/array.js";
import { looseEquals } from "../../../util/string.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, isHttpUrl, parseUrl } from "../../../util/url.js";
import { instrument } from "../../../instrumentation/index.js";
import { find } from "../../../util/host-rules.js";
import { parseJson } from "../../../util/common.js";
import { formatCommitMessage } from "../../../util/git/commit-trailers.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { setBaseUrl } from "../../../util/http/github.js";
import { GithubBranchProtection, GithubBranchRulesets, GithubIssue, GithubVulnerabilityAlerts } from "./schema.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { incLimitedValue } from "../../../workers/global/limits.js";
import { toLongCommitSha } from "../../../util/schema-utils/git.js";
import { diffCommitTree, fetchBranch, forcePushToRemote, getBranchCommit, getCommitTreeSha, initRepo as initRepo$1, prepareCommit, pushCommitToRenovateRef, resetToCommit, setPlatformIgnoredAuthors } from "../../../util/git/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { isGithubFineGrainedPersonalAccessToken } from "../../../util/check-token.js";
import { coerceToNull } from "../../../util/coerce.js";
import { repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { coerceRestPr, githubApi, mapMergeStartegy } from "./common.js";
import { remoteBranchExists } from "./branch.js";
import { getRepoFile } from "./files.js";
import { enableAutoMergeMutation, enqueuePullRequestMutation, getIssuesQuery, repoInfoQuery, repoMergeQueueQuery } from "./graphql.js";
import { GithubIssueCache } from "./issue.js";
import { massageMarkdownLinks } from "./massage-markdown-links.js";
import { getPrCache, isPrInMergeQueue as isPrInMergeQueue$1, updatePrCache } from "./pr.js";
import { getAppDetails, getUserDetails, getUserEmail } from "./user.js";
import { getRepoUrl, isGithubEnterpriseServer, warnIfDefaultGitAuthorEmail } from "./utils.js";
import { isArray, isNonEmptyObject, isNonEmptyString } from "@sindresorhus/is";
import semver from "semver";
import { setTimeout } from "node:timers/promises";
//#region lib/modules/platform/github/index.ts
var github_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addLabels: () => addLabels,
	addReviewers: () => addReviewers,
	assertPrNotInMergeQueue: () => assertPrNotInMergeQueue,
	commitFiles: () => commitFiles,
	createFork: () => createFork,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	findFork: () => findFork,
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
	getVulnerabilityAlerts: () => getVulnerabilityAlerts,
	id: () => id,
	initPlatform: () => initPlatform,
	initRepo: () => initRepo,
	isBranchMergeQueueEnabled: () => isBranchMergeQueueEnabled,
	isGHApp: () => isGHApp,
	isPrInMergeQueue: () => isPrInMergeQueue,
	listForks: () => listForks,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	reattemptPlatformAutomerge: () => reattemptPlatformAutomerge,
	resetConfigs: () => resetConfigs,
	setBranchStatus: () => setBranchStatus,
	tryReuseAutoclosedPr: () => tryReuseAutoclosedPr,
	updatePr: () => updatePr
});
const id = "github";
let config;
let platformConfig;
const defaultGithubApiUrl = "https://api.github.com/";
const GitHubMaxPrBodyLen = 58e3;
function resetConfigs() {
	config = {};
	platformConfig = { host: {
		type: "github",
		apiUrl: parseUrl(defaultGithubApiUrl)
	} };
}
resetConfigs();
function escapeHash(input) {
	return input?.replace(regEx(/#/g), "%23");
}
function isGHApp() {
	return !!platformConfig.isGHApp;
}
async function detectGithubHost(apiUrl, token) {
	const { hostname } = apiUrl;
	if (hostname === "api.github.com") return {
		type: "github",
		apiUrl
	};
	if (hostname.endsWith(".ghe.com")) {
		logger.debug("Detected GitHub Enterprise Cloud");
		return {
			type: "ghec",
			apiUrl
		};
	}
	const gheHeaderKey = "x-github-enterprise-version";
	const gheQueryRes = await githubApi.headJson("/", { token });
	const gheHeaders = coerceObject(gheQueryRes?.headers);
	const gheVersionHeader = Object.entries(gheHeaders).find(([k]) => k.toLowerCase() === gheHeaderKey);
	const version = semver.valid(gheVersionHeader?.[1]) ?? null;
	logger.debug(`Detected GitHub Enterprise Server, version: ${version}`);
	return {
		type: "ghes",
		apiUrl,
		version
	};
}
async function initPlatform({ endpoint, token: originalToken, username, gitAuthor }) {
	let token = originalToken;
	if (!token) throw new Error("Init: You must configure a GitHub token");
	token = token.replace(regEx(/^ghs_/), "x-access-token:ghs_");
	platformConfig.isGHApp = token.startsWith("x-access-token:");
	let githubApiUrl = platformConfig.host.apiUrl;
	if (endpoint) {
		const parsedApiUrl = parseUrl(ensureTrailingSlash(endpoint));
		if (!parsedApiUrl || !isHttpUrl(parsedApiUrl)) throw new Error(`Init: Invalid GitHub endpoint URL: ${endpoint}`);
		githubApiUrl = parsedApiUrl;
		setBaseUrl(githubApiUrl.href);
	} else logger.debug(`Using default github endpoint: ${githubApiUrl.href}`);
	platformConfig.host = await detectGithubHost(githubApiUrl, token);
	/**
	* GHE requires version >=3.10 to support fine-grained access tokens
	* https://docs.github.com/en/enterprise-server@3.10/admin/release-notes#authentication
	*/
	if (isGithubFineGrainedPersonalAccessToken(token) && isGithubEnterpriseServer(platformConfig.host) && (!platformConfig.host.version || semver.lt(platformConfig.host.version, "3.10.0"))) throw new Error("Init: Fine-grained Personal Access Tokens do not support GitHub Enterprise Server API version <3.10 and cannot be used with Renovate.");
	let renovateUsername;
	if (username) renovateUsername = username;
	else if (platformConfig.isGHApp) {
		platformConfig.userDetails ??= await getAppDetails(token);
		renovateUsername = platformConfig.userDetails.username;
	} else {
		platformConfig.userDetails ??= await getUserDetails(platformConfig.host.apiUrl.href, token);
		renovateUsername = platformConfig.userDetails.username;
	}
	let ghHostname;
	if (platformConfig.host.type === "ghec") ghHostname = "ghe.com";
	else if (platformConfig.host.type === "ghes") ghHostname = platformConfig.host.apiUrl.hostname;
	else ghHostname = "github.com";
	let discoveredGitAuthor;
	if (!gitAuthor) {
		if (platformConfig.isGHApp) {
			platformConfig.userDetails ??= await getAppDetails(token);
			// v8 ignore next -- TODO: coverage error #40625
			discoveredGitAuthor = `${platformConfig.userDetails.name} <${platformConfig.userDetails.id}+${platformConfig.userDetails.username}@users.noreply.${ghHostname}>`;
		} else {
			platformConfig.userDetails ??= await getUserDetails(platformConfig.host.apiUrl.href, token);
			// v8 ignore next -- TODO: coverage error #40625
			platformConfig.userEmail = platformConfig.userDetails.email ?? await getUserEmail(platformConfig.host.apiUrl.href, token);
			if (platformConfig.userEmail) discoveredGitAuthor = `${platformConfig.userDetails.name} <${platformConfig.userEmail}>`;
		}
	}
	setPlatformIgnoredAuthors([`noreply@${ghHostname}`]);
	logger.debug({
		platformConfig,
		renovateUsername
	}, "Platform config");
	const platformResult = {
		endpoint: platformConfig.host.apiUrl.href,
		gitAuthor: gitAuthor ?? discoveredGitAuthor,
		renovateUsername,
		token
	};
	warnIfDefaultGitAuthorEmail(platformResult.gitAuthor, platformConfig.host.type !== "github");
	if (getEnv().RENOVATE_X_GITHUB_HOST_RULES && platformResult.endpoint === "https://api.github.com/") {
		logger.debug("Adding GitHub token as GHCR password");
		platformResult.hostRules = [{
			matchHost: "ghcr.io",
			hostType: "docker",
			username: "USERNAME",
			password: token.replace(regEx(/^x-access-token:/), "")
		}];
		logger.debug("Adding GitHub token as npm.pkg.github.com Basic token");
		platformResult.hostRules.push({
			matchHost: "npm.pkg.github.com",
			hostType: "npm",
			token: token.replace(regEx(/^x-access-token:/), "")
		});
		for (const hostType of [
			"rubygems",
			"maven",
			"nuget"
		]) {
			logger.debug(`Adding GitHub token as ${hostType}.pkg.github.com password`);
			platformResult.hostRules.push({
				hostType,
				matchHost: `${hostType}.pkg.github.com`,
				username: renovateUsername,
				password: token.replace(regEx(/^x-access-token:/), "")
			});
		}
	}
	return platformResult;
}
async function fetchRepositories() {
	try {
		if (isGHApp()) return (await githubApi.getJsonUnchecked(`installation/repositories?per_page=100`, {
			paginationField: "repositories",
			paginate: "all"
		})).body.repositories;
		return (await githubApi.getJsonUnchecked(`user/repos?per_page=100`, { paginate: "all" })).body;
	} catch (err) /* v8 ignore next -- defensive: repo listing failures are logged and rethrown, not simulated in specs */ {
		logger.error({ err }, `GitHub getRepos error`);
		throw err;
	}
}
async function getRepos(config) {
	logger.debug("Autodiscovering GitHub repositories");
	const nonEmptyRepositories = (await fetchRepositories()).filter(isNonEmptyObject);
	const nonArchivedRepositories = nonEmptyRepositories.filter((repo) => !repo.archived);
	if (nonArchivedRepositories.length < nonEmptyRepositories.length) logger.debug(`Filtered out ${nonEmptyRepositories.length - nonArchivedRepositories.length} archived repositories`);
	if (!config?.topics) return nonArchivedRepositories.map((repo) => repo.full_name);
	logger.debug({ topics: config.topics }, "Filtering by topics");
	const topicRepositories = nonArchivedRepositories.filter((repo) => repo.topics?.some((topic) => config?.topics?.includes(topic)));
	// v8 ignore else -- TODO: add test #40625
	if (topicRepositories.length < nonArchivedRepositories.length) logger.debug(`Filtered out ${nonArchivedRepositories.length - topicRepositories.length} repositories not matching topic filters`);
	return topicRepositories.map((repo) => repo.full_name);
}
async function getBranchProtection(branchName) {
	if (config.parentRepo) return {};
	return (await githubApi.getJson(`repos/${config.repository}/branches/${escapeHash(branchName)}/protection`, { cacheProvider: repoCacheProvider }, GithubBranchProtection)).body;
}
async function getBranchRulesets(branchName) {
	if (config.parentRepo) return [];
	try {
		return (await githubApi.getJson(`repos/${config.repository}/rules/branches/${escapeHash(branchName)}`, { cacheProvider: repoCacheProvider }, GithubBranchRulesets)).body;
	} catch (err) {
		if (err.statusCode === 404) {
			logger.debug(`No branch rulesets found for ${branchName}`);
			return [];
		}
		throw err;
	}
}
async function getRawFile(fileName, repoName, branchOrTag) {
	const repo = repoName ?? config.repository;
	const httpOptions = {};
	// v8 ignore else -- TODO: add test #40625
	if (repo?.split("/")?.[0] === config.repositoryOwner) httpOptions.cacheProvider = repoCacheProvider;
	return await getRepoFile(githubApi, repo, fileName, branchOrTag, httpOptions);
}
async function getJsonFile(fileName, repoName, branchOrTag) {
	const raw = await getRawFile(fileName, repoName, branchOrTag);
	return parseJson(raw, fileName);
}
async function listForks(token, repository) {
	try {
		const url = `repos/${repository}/forks?per_page=100`;
		const repos = (await githubApi.getJsonUnchecked(url, {
			token,
			paginate: true,
			pageLimit: 100
		})).body;
		logger.debug(`Found ${repos.length} forked repo(s)`);
		return repos;
	} catch (err) {
		if (err.statusCode === 404) logger.debug("Cannot list repo forks - it is likely private");
		else logger.debug({ err }, "Unknown error listing repository forks");
		throw new Error(REPOSITORY_CANNOT_FORK);
	}
}
async function findFork(token, repository, forkOrg) {
	const forks = await listForks(token, repository);
	if (forkOrg) {
		logger.debug(`Searching for forked repo in forkOrg (${forkOrg})`);
		const forkedRepo = forks.find((repo) => repo.owner.login === forkOrg);
		if (forkedRepo) {
			logger.debug(`Found repo in forkOrg: ${forkedRepo.full_name}`);
			return forkedRepo;
		}
		logger.debug(`No repo found in forkOrg`);
	}
	logger.debug(`Searching for forked repo in user account`);
	try {
		const { username } = await getUserDetails(platformConfig.host.apiUrl.href, token);
		const forkedRepo = forks.find((repo) => repo.owner.login === username);
		if (forkedRepo) {
			logger.debug(`Found repo in user account: ${forkedRepo.full_name}`);
			return forkedRepo;
		}
	} catch {
		throw new Error(REPOSITORY_CANNOT_FORK);
	}
	logger.debug(`No repo found in user account`);
	return null;
}
async function createFork(token, repository, forkOrg) {
	let forkedRepo;
	try {
		forkedRepo = (await githubApi.postJson(`repos/${repository}/forks`, {
			token,
			body: {
				organization: forkOrg ?? void 0,
				name: config.parentRepo.replace("/", "-_-"),
				default_branch_only: true
			}
		})).body;
	} catch (err) {
		logger.debug({ err }, "Error creating fork");
	}
	if (!forkedRepo) throw new Error(REPOSITORY_CANNOT_FORK);
	logger.info({ forkedRepo: forkedRepo.full_name }, "Created forked repo");
	logger.debug(`Sleeping 30s after creating fork`);
	await setTimeout(3e4);
	return forkedRepo;
}
async function initRepo({ repository, forkCreation, forkOrg, forkToken, gitUrl, renovateUsername, cloneSubmodules, cloneSubmodulesFilter }) {
	logger.debug(`initRepo("${repository}")`);
	config = {
		repository,
		cloneSubmodules,
		cloneSubmodulesFilter,
		ignorePrAuthor: GlobalConfig.get("ignorePrAuthor"),
		mergeQueueEnabled: {}
	};
	const opts = find({
		hostType: "github",
		url: platformConfig.host.apiUrl.href,
		readOnly: true
	});
	config.renovateUsername = renovateUsername;
	[config.repositoryOwner, config.repositoryName] = repository.split("/");
	let repo;
	let forkSshUrl = null;
	try {
		let infoQuery = repoInfoQuery;
		if (isGithubEnterpriseServer(platformConfig.host) && semver.satisfies(platformConfig.host.version ?? "", "<3.3.0")) {
			infoQuery = infoQuery.replace(regEx(/\n\s*autoMergeAllowed\s*\n/), "\n");
			infoQuery = infoQuery.replace(regEx(/\n\s*hasIssuesEnabled\s*\n/), "\n");
		}
		if (isGithubEnterpriseServer(platformConfig.host) && semver.satisfies(platformConfig.host.version ?? "", "<3.9.0")) infoQuery = infoQuery.replace(regEx(/\n\s*hasVulnerabilityAlertsEnabled\s*\n/), "\n");
		if (isGithubEnterpriseServer(platformConfig.host) && semver.satisfies(platformConfig.host.version ?? "", "<3.12.0")) infoQuery = infoQuery.replace(regEx(/\n\s*mergeQueue\s*\{\s*id\s*\}\s*\n/), "\n");
		const res = await githubApi.requestGraphql(infoQuery, {
			variables: {
				owner: config.repositoryOwner,
				name: config.repositoryName,
				...!config.ignorePrAuthor && { user: renovateUsername }
			},
			readOnly: true,
			count: 1
		});
		if (res?.errors) {
			logger.debug({ res }, "Unexpected GraphQL errors");
			throw new Error(PLATFORM_UNKNOWN_ERROR);
		}
		repo = res?.data?.repository;
		/* v8 ignore next -- defensive: GraphQL errors are handled above, a null repository is not mocked in specs */
		if (!repo) {
			logger.debug({ res }, "No repository returned");
			throw new Error(REPOSITORY_NOT_FOUND);
		}
		/* v8 ignore next -- empty-repo detection via missing defaultBranchRef is not mocked in specs */
		if (!repo.defaultBranchRef?.name) {
			logger.debug({ res }, "No default branch returned - treating repo as empty");
			throw new Error(REPOSITORY_EMPTY);
		}
		if (repo.nameWithOwner && repo.nameWithOwner.toUpperCase() !== repository.toUpperCase()) {
			logger.debug({
				desiredRepo: repository,
				foundRepo: repo.nameWithOwner
			}, "Repository has been renamed");
			throw new Error(REPOSITORY_RENAMED);
		}
		if (repo.isArchived) {
			logger.debug("Repository is archived - throwing error to abort renovation");
			throw new Error(REPOSITORY_ARCHIVED);
		}
		config.defaultBranch = repo.defaultBranchRef.name;
		logger.debug(`${repository} default branch = ${config.defaultBranch}`);
		if (repo.squashMergeAllowed) config.mergeMethod = "squash";
		else if (repo.mergeCommitAllowed) config.mergeMethod = "merge";
		else if (repo.rebaseMergeAllowed) config.mergeMethod = "rebase";
		else logger.debug("Could not find allowed merge methods for repo");
		config.autoMergeAllowed = repo.autoMergeAllowed;
		config.hasIssuesEnabled = repo.hasIssuesEnabled;
		config.hasVulnerabilityAlertsEnabled = repo.hasVulnerabilityAlertsEnabled;
		config.mergeQueueEnabled[config.defaultBranch] = isNonEmptyObject(repo.mergeQueue);
		const recentIssues = GithubIssue.array().catch([]).parse(res?.data?.repository?.issues?.nodes);
		GithubIssueCache.addIssuesToReconcile(recentIssues);
	} catch (err) /* v8 ignore next -- initRepo error mapping needs failure shapes not mocked in specs */ {
		logger.debug({ err }, "Caught initRepo error");
		if (err.message === "archived" || err.message === "renamed" || err.message === "not-found") throw err;
		if (err.statusCode === 403) throw new Error(REPOSITORY_ACCESS_FORBIDDEN);
		if (err.statusCode === 404) throw new Error(REPOSITORY_NOT_FOUND);
		if (err.message.startsWith("Repository access blocked")) throw new Error(REPOSITORY_BLOCKED);
		if (err.message === "fork-mode-forked") throw err;
		if (err.message === "fork") throw err;
		if (err.message === "disabled") throw err;
		if (err.message === "Response code 451 (Unavailable for Legal Reasons)") throw new Error(REPOSITORY_ACCESS_FORBIDDEN);
		logger.debug({ err }, "Unknown GitHub initRepo error");
		throw err;
	}
	config.prList = null;
	if (forkToken) {
		logger.debug("Renovate is in fork mode");
		if (repo.isFork) {
			logger.debug(`Forked repos cannot be processed when running with a forkToken, so this repo will be skipped`);
			logger.debug(`Parent repo for this forked repo is ${repo.parent?.nameWithOwner}`);
			throw new Error(REPOSITORY_FORKED);
		}
		config.forkOrg = forkOrg;
		config.forkToken = forkToken;
		config.parentRepo = config.repository;
		config.repository = null;
		let forkedRepo = await findFork(forkToken, repository, forkOrg);
		if (forkedRepo) {
			config.repository = forkedRepo.full_name;
			forkSshUrl = forkedRepo.ssh_url;
			const forkDefaultBranch = forkedRepo.default_branch;
			if (forkDefaultBranch !== config.defaultBranch) {
				const body = {
					ref: `refs/heads/${config.defaultBranch}`,
					sha: repo.defaultBranchRef.target.oid
				};
				logger.debug({
					defaultBranch: config.defaultBranch,
					forkDefaultBranch,
					body
				}, "Fork has different default branch to parent, attempting to create branch");
				try {
					await githubApi.postJson(`repos/${config.repository}/git/refs`, {
						body,
						token: forkToken
					});
					logger.debug("Created new default branch in fork");
				} catch (err) /* v8 ignore next -- fork default-branch creation failures are not mocked in specs */ {
					if (err.response?.body?.message === "Reference already exists") logger.debug(`Branch ${config.defaultBranch} already exists in the fork`);
					else logger.warn({
						err,
						body: err.response?.body
					}, "Could not create parent defaultBranch in fork");
				}
				logger.debug(`Setting ${config.defaultBranch} as default branch for ${config.repository}`);
				try {
					await githubApi.patchJson(`repos/${config.repository}`, {
						body: {
							name: config.repository.split("/")[1],
							default_branch: config.defaultBranch
						},
						token: forkToken
					});
					logger.debug("Successfully changed default branch for fork");
				} catch (err) /* v8 ignore next -- defensive: fork default-branch update failures are logged and swallowed, not simulated in specs */ {
					logger.warn({ err }, "Could not set default branch");
				}
			}
		} else if (forkCreation) {
			logger.debug("Forked repo is not found - attempting to create it");
			forkedRepo = await createFork(forkToken, repository, forkOrg);
			config.repository = forkedRepo.full_name;
			forkSshUrl = forkedRepo.ssh_url;
		} else {
			logger.debug("Forked repo is not found and forkCreation is disabled");
			throw new Error(REPOSITORY_FORK_MISSING);
		}
	}
	let authToken;
	if (forkToken) {
		logger.debug("Using forkToken for git init");
		authToken = coerceToNull(config.forkToken);
	} else {
		const tokenType = opts.token?.startsWith("x-access-token:") ? "app" : "personal access";
		logger.debug(`Using ${tokenType} token for git init`);
		authToken = opts.token ?? null;
	}
	const workingSshUrl = forkToken ? forkSshUrl : repo.sshUrl;
	const url = getRepoUrl(config.repository, gitUrl, workingSshUrl, platformConfig.host.apiUrl, authToken);
	let upstreamUrl;
	if (forkCreation && config.parentRepo) upstreamUrl = getRepoUrl(config.parentRepo, gitUrl, repo.sshUrl, platformConfig.host.apiUrl, authToken);
	await initRepo$1({
		...config,
		url,
		upstreamUrl
	});
	return {
		defaultBranch: config.defaultBranch,
		isFork: repo.isFork === true,
		repoFingerprint: repoFingerprint(repo.id, platformConfig.host.apiUrl.href)
	};
}
async function checkRulesetsForForceRebase(branchName) {
	try {
		const rulesets = await getBranchRulesets(branchName);
		logger.trace(`Ruleset: Found ${rulesets.length} rulesets for branch ${branchName}`);
		return rulesets.some((rule) => {
			if (rule.type === "required_status_checks" && rule.parameters?.strict_required_status_checks_policy === true) {
				logger.debug(`Ruleset: strict required status checks found for ${branchName}`);
				return true;
			}
			return false;
		});
	} catch (err) {
		handleBranchProtectionError("rulesets", err, branchName);
		return false;
	}
}
async function checkBranchProtectionForForceRebase(branchName) {
	try {
		const branchProtection = await getBranchProtection(branchName);
		logger.trace(`Found branch protection for branch ${branchName}`);
		if (branchProtection?.required_status_checks?.strict) {
			logger.debug(`Branch protection: PRs must be up-to-date before merging for ${branchName}`);
			return true;
		}
		return false;
	} catch (err) {
		handleBranchProtectionError("branch-protection", err, branchName);
		return false;
	}
}
async function getBranchForceRebase(branchName) {
	config.branchForceRebase ??= {};
	const cachedResult = config.branchForceRebase[branchName];
	if (cachedResult !== void 0) return cachedResult;
	config.branchForceRebase[branchName] = false;
	if (await checkRulesetsForForceRebase(branchName)) {
		config.branchForceRebase[branchName] = true;
		return true;
	}
	if (await checkBranchProtectionForForceRebase(branchName)) config.branchForceRebase[branchName] = true;
	return config.branchForceRebase[branchName];
}
function handleBranchProtectionError(protection, err, branchName) {
	if (err.statusCode === 404) {
		logger.debug(`No ${protection} found for ${branchName}`);
		return;
	}
	if (err.message === "integration-unauthorized" || err.statusCode === 403) {
		logger.once.debug(`Branch protection: Do not have permissions to detect ${protection} for ${branchName}`);
		return;
	}
	throw err;
}
function cachePr(pr) {
	config.prList ??= [];
	// v8 ignore else -- TODO: add test #40625
	if (pr) {
		updatePrCache(pr);
		for (let idx = 0; idx < config.prList.length; idx += 1) if (config.prList[idx].number === pr.number) {
			config.prList[idx] = pr;
			return;
		}
		config.prList.push(pr);
	}
}
async function fetchPr(prNo) {
	try {
		const { body: ghRestPr } = await githubApi.getJsonUnchecked(`repos/${config.parentRepo ?? config.repository}/pulls/${prNo}`);
		const result = coerceRestPr(ghRestPr);
		cachePr(result);
		return result;
	} catch (err) {
		logger.warn({
			err,
			prNo
		}, `GitHub fetchPr error`);
		return null;
	}
}
async function getPr(prNo) {
	if (!prNo) return null;
	let pr = (await getPrList()).find(({ number }) => number === prNo) ?? null;
	if (pr) logger.debug("Returning PR from cache");
	pr ??= await fetchPr(prNo);
	return pr;
}
function matchesState(state, desiredState) {
	if (desiredState === "all") return true;
	if (desiredState.startsWith("!")) return state !== desiredState.substring(1);
	return state === desiredState;
}
async function getPrList() {
	if (!config.prList) {
		const repo = config.parentRepo ?? config.repository;
		let username = config.renovateUsername;
		if (config.forkToken || config.ignorePrAuthor) username = void 0;
		const prCache = await instrument("getPrCache", () => getPrCache(githubApi, repo, username));
		config.prList = Object.values(prCache).sort(({ number: a }, { number: b }) => b - a);
	}
	return config.prList;
}
async function findPr({ branchName, prTitle, state = "all", includeOtherAuthors }) {
	logger.debug(`findPr(${branchName}, ${prTitle}, ${state})`);
	if (includeOtherAuthors) {
		const repo = config.parentRepo ?? config.repository;
		const org = repo?.split("/")[0];
		const { body: prList } = await githubApi.getJsonUnchecked(`repos/${repo}/pulls?head=${org}:${branchName}&state=open`, { cacheProvider: repoCacheProvider });
		if (!prList.length) {
			logger.debug(`No PR found for branch ${branchName}`);
			return null;
		}
		return coerceRestPr(prList[0]);
	}
	const pr = (await getPrList()).find((p) => {
		if (p.sourceBranch !== branchName) return false;
		if (prTitle && prTitle.toUpperCase() !== p.title.toUpperCase()) return false;
		if (!matchesState(p.state, state)) return false;
		if (!config.forkToken && !looseEquals(config.repository, p.sourceRepo)) return false;
		return true;
	});
	if (pr) logger.debug(`Found PR #${pr.number}`);
	return pr ?? null;
}
async function ensureBranchSha(branchName, sha) {
	const repository = config.repository;
	try {
		const commitUrl = `/repos/${repository}/git/commits/${sha}`;
		await githubApi.head(commitUrl, { memCache: false });
	} catch (err) {
		logger.error({
			err,
			sha,
			branchName
		}, "Commit not found");
		throw err;
	}
	const refUrl = `/repos/${config.repository}/git/refs/heads/${branchName}`;
	if (await remoteBranchExists(repository, branchName)) try {
		await githubApi.patchJson(refUrl, { body: {
			sha,
			force: true
		} });
		return;
	} catch (err) {
		if (err.err?.response?.statusCode === 422) logger.debug({ err }, "Branch update failed due to reference not existing - will try to create");
		else {
			logger.warn({
				refUrl,
				err
			}, "Error updating branch");
			throw err;
		}
	}
	await githubApi.postJson(`/repos/${repository}/git/refs`, { body: {
		sha,
		ref: `refs/heads/${branchName}`
	} });
}
async function getBranchPr(branchName) {
	logger.debug(`getBranchPr(${branchName})`);
	const openPr = await findPr({
		branchName,
		state: "open"
	});
	if (openPr) return openPr;
	return null;
}
async function tryReuseAutoclosedPr(autoclosedPr, newTitle) {
	const { sha, number, sourceBranch: branchName } = autoclosedPr;
	try {
		await ensureBranchSha(branchName, sha);
		logger.debug(`Recreated autoclosed branch ${branchName} with sha ${sha}`);
	} catch (err) {
		logger.debug({
			err,
			branchName,
			sha,
			autoclosedPr
		}, "Could not recreate autoclosed branch - skipping reopen");
		return null;
	}
	try {
		const { body: ghPr } = await githubApi.patchJson(`repos/${config.repository}/pulls/${number}`, { body: {
			state: "open",
			title: newTitle
		} });
		logger.info({
			branchName,
			oldTitle: autoclosedPr.title,
			newTitle,
			number
		}, "Successfully reopened autoclosed PR");
		const result = coerceRestPr(ghPr);
		const localSha = getBranchCommit(branchName);
		// v8 ignore else -- TODO: add test #40625
		if (localSha && localSha !== sha) {
			await forcePushToRemote(branchName, "origin");
			result.sha = localSha;
		}
		cachePr(result);
		return result;
	} catch {
		logger.debug("Could not reopen autoclosed PR");
		return null;
	}
}
async function getStatus(branchName, useCache = true) {
	const branch = escapeHash(branchName);
	const url = `repos/${config.repository}/commits/${branch}/status`;
	const { body: status } = await githubApi.getJsonUnchecked(url, {
		memCache: useCache,
		cacheProvider: repoCacheProvider
	});
	return status;
}
async function getBranchStatus(branchName, internalChecksAsSuccess) {
	logger.debug(`getBranchStatus(${branchName})`);
	let commitStatus;
	try {
		commitStatus = await getStatus(branchName);
	} catch (err) /* v8 ignore next -- 404-to-REPOSITORY_CHANGED mapping for deleted branches is not mocked in specs */ {
		if (err.statusCode === 404) {
			logger.debug("Received 404 when checking branch status, assuming that branch has been deleted");
			throw new Error(REPOSITORY_CHANGED);
		}
		logger.debug("Unknown error when checking branch status");
		throw err;
	}
	logger.debug({
		state: commitStatus.state,
		statuses: commitStatus.statuses
	}, "branch status check result");
	if (commitStatus.statuses && !internalChecksAsSuccess) {
		commitStatus.statuses = commitStatus.statuses.filter((status) => status.state !== "success" || !status.context?.startsWith("renovate/"));
		// v8 ignore else -- TODO: add test #40625
		if (!commitStatus.statuses.length) {
			logger.debug("Successful checks are all internal renovate/ checks, so returning \"pending\" branch status");
			commitStatus.state = "pending";
		}
	}
	let checkRuns = [];
	try {
		const checkRunsUrl = `repos/${config.repository}/commits/${escapeHash(branchName)}/check-runs?per_page=100`;
		const opts = {
			headers: { accept: "application/vnd.github.antiope-preview+json" },
			paginate: true,
			paginationField: "check_runs",
			cacheProvider: memCacheProvider
		};
		const checkRunsRaw = (await githubApi.getJsonUnchecked(checkRunsUrl, opts)).body;
		if (checkRunsRaw.check_runs?.length) {
			checkRuns = checkRunsRaw.check_runs.map((run) => ({
				name: run.name,
				status: run.status,
				conclusion: run.conclusion
			}));
			logger.debug({ checkRuns }, "check runs result");
		} else logger.debug({ result: checkRunsRaw }, "No check runs found");
	} catch (err) /* v8 ignore next -- check-run permission errors (403) are mapped to empty results, not mocked in specs */ {
		if (err instanceof ExternalHostError) throw err;
		if (err.statusCode === 403 || err.message === "integration-unauthorized") logger.debug("No permission to view check runs");
		else logger.warn({ err }, "Error retrieving check runs");
	}
	if (checkRuns.length === 0) {
		if (commitStatus.state === "success") return "green";
		if (commitStatus.state === "failure") return "red";
		return "yellow";
	}
	if (commitStatus.state === "failure" || checkRuns.some((run) => run.conclusion === "failure")) return "red";
	if ((commitStatus.state === "success" || commitStatus.statuses.length === 0) && checkRuns.every((run) => [
		"skipped",
		"neutral",
		"success"
	].includes(run.conclusion))) return "green";
	return "yellow";
}
async function getStatusCheck(branchName, useCache = true) {
	const branchCommit = getBranchCommit(branchName);
	const url = `repos/${config.repository}/commits/${branchCommit}/statuses`;
	const opts = useCache ? { cacheProvider: memCacheProvider } : { memCache: false };
	return (await githubApi.getJsonUnchecked(url, opts)).body;
}
const githubToRenovateStatusMapping = {
	success: "green",
	error: "red",
	failure: "red",
	pending: "yellow"
};
async function getBranchStatusCheck(branchName, context) {
	try {
		const res = await getStatusCheck(branchName);
		for (const check of res) if (check.context === context) return githubToRenovateStatusMapping[check.state] || "yellow";
		return null;
	} catch (err) /* v8 ignore next -- 404-to-REPOSITORY_CHANGED mapping for missing commits is not mocked in specs */ {
		if (err.statusCode === 404) {
			logger.debug("Commit not found when checking statuses");
			throw new Error(REPOSITORY_CHANGED);
		}
		throw err;
	}
}
async function setBranchStatus({ branchName, context, description, state, url: targetUrl }) {
	/* v8 ignore next -- specs do not run setBranchStatus in forking mode */
	if (config.parentRepo) {
		logger.debug("Cannot set branch status when in forking mode");
		return;
	}
	if (await getBranchStatusCheck(branchName, context) === state) return;
	logger.debug({
		branch: branchName,
		context,
		state
	}, "Setting branch status");
	let url;
	try {
		const branchCommit = getBranchCommit(branchName);
		url = `repos/${config.repository}/statuses/${branchCommit}`;
		const options = {
			state: {
				green: "success",
				yellow: "pending",
				red: "failure"
			}[state],
			description,
			context
		};
		// v8 ignore else -- TODO: add test #40625
		if (targetUrl) options.target_url = targetUrl;
		await githubApi.postJson(url, { body: options });
		await getStatus(branchName, false);
		await getStatusCheck(branchName, false);
	} catch (err) /* v8 ignore next -- defensive: status POST failures abort with REPOSITORY_CHANGED, not simulated in specs */ {
		logger.debug({
			err,
			url
		}, "Caught error setting branch status - aborting");
		throw new Error(REPOSITORY_CHANGED);
	}
}
async function getIssues() {
	const result = await githubApi.queryRepoField(getIssuesQuery, "issues", {
		variables: {
			owner: config.repositoryOwner,
			name: config.repositoryName,
			...!config.ignorePrAuthor && { user: config.renovateUsername }
		},
		readOnly: true
	});
	logger.debug(`Retrieved ${result.length} issues`);
	return GithubIssue.array().parse(result);
}
async function getIssueList() {
	/* v8 ignore next -- specs initialize repos with issues enabled */
	if (config.hasIssuesEnabled === false) return [];
	let issueList = GithubIssueCache.getIssues();
	// v8 ignore else -- TODO: add test #40625
	if (!issueList) {
		logger.debug("Retrieving issueList");
		issueList = await getIssues();
		GithubIssueCache.setIssues(issueList);
	}
	return issueList;
}
async function getIssue(number) {
	if (config.hasIssuesEnabled === false) return null;
	try {
		const repo = config.parentRepo ?? config.repository;
		const { body: issue } = await githubApi.getJson(`repos/${repo}/issues/${number}`, { cacheProvider: repoCacheProvider }, GithubIssue);
		GithubIssueCache.updateIssue(issue);
		return issue;
	} catch (err) {
		logger.debug({
			err,
			number
		}, "Error getting issue");
		if (err.response?.statusCode === 410) {
			logger.debug(`Issue #${number} has been deleted`);
			GithubIssueCache.deleteIssue(number);
		}
		return null;
	}
}
async function findIssue(title) {
	logger.debug(`findIssue(${title})`);
	const [issue] = (await getIssueList()).filter((i) => i.state === "open" && i.title === title);
	if (!issue) return null;
	logger.debug(`Found issue ${issue.number}`);
	return getIssue(issue.number);
}
async function closeIssue(issueNumber) {
	logger.debug(`closeIssue(${issueNumber})`);
	const repo = config.parentRepo ?? config.repository;
	try {
		const { body: closedIssue } = await githubApi.patchJson(`repos/${repo}/issues/${issueNumber}`, { body: { state: "closed" } }, GithubIssue);
		GithubIssueCache.updateIssue(closedIssue);
	} catch (err) {
		const statusCode = err.response?.statusCode;
		if (statusCode === 404 || statusCode === 410) {
			logger.debug(`Issue #${issueNumber} no longer exists on the platform, removing from cache`);
			GithubIssueCache.deleteIssue(issueNumber);
			return;
		}
		throw err;
	}
}
async function ensureIssue({ title, reuseTitle, body: rawBody, labels, once = false, shouldReOpen = true }) {
	logger.debug(`ensureIssue(${title})`);
	/* v8 ignore next -- specs initialize repos with issues enabled */
	if (config.hasIssuesEnabled === false) {
		logger.info("Cannot ensure issue because issues are disabled in this repository");
		return null;
	}
	const body = sanitize(rawBody);
	try {
		const issueList = await getIssueList();
		let issues = issueList.filter((i) => i.title === title);
		if (!issues.length) {
			issues = issueList.filter((i) => i.title === reuseTitle);
			if (issues.length) logger.debug(`Reusing issue title: "${reuseTitle}"`);
		}
		if (issues.length) {
			let issue = issues.find((i) => i.state === "open");
			if (!issue) {
				if (once) {
					logger.debug("Issue already closed - skipping recreation");
					return null;
				}
				if (shouldReOpen) logger.debug("Reopening previously closed issue");
				issue = issues.at(-1);
			}
			for (const i of issues) if (i.state === "open" && i.number !== issue.number) {
				logger.warn({ issueNo: i.number }, "Closing duplicate issue");
				await closeIssue(i.number);
			}
			const repo = config.parentRepo ?? config.repository;
			const { body: serverIssue } = await githubApi.getJson(`repos/${repo}/issues/${issue.number}`, { cacheProvider: repoCacheProvider }, GithubIssue);
			GithubIssueCache.updateIssue(serverIssue);
			if (issue.title === title && serverIssue.body === body && issue.state === "open") {
				logger.debug("Issue is open and up to date - nothing to do");
				return null;
			}
			if (shouldReOpen || issue.state === "open") {
				logger.debug("Patching issue");
				const data = {
					body,
					state: "open",
					title
				};
				if (labels) data.labels = labels;
				const repo = config.parentRepo ?? config.repository;
				const { body: updatedIssue } = await githubApi.patchJson(`repos/${repo}/issues/${issue.number}`, { body: data }, GithubIssue);
				GithubIssueCache.updateIssue(updatedIssue);
				logger.debug("Issue updated");
				return "updated";
			}
		}
		const { body: createdIssue } = await githubApi.postJson(`repos/${config.parentRepo ?? config.repository}/issues`, { body: {
			title,
			body,
			labels: coerceArray(labels)
		} }, GithubIssue);
		logger.info("Issue created");
		GithubIssueCache.updateIssue(createdIssue);
		return "created";
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		if (err.body?.message?.startsWith("Issues are disabled for this repo")) logger.debug(`Issues are disabled, so could not create issue: ${title}`);
		else logger.warn({ err }, "Could not ensure issue");
	}
	return null;
}
async function ensureIssueClosing(title) {
	logger.trace(`ensureIssueClosing(${title})`);
	/* v8 ignore next -- specs initialize repos with issues enabled */
	if (config.hasIssuesEnabled === false) return;
	const issueList = await getIssueList();
	for (const issue of issueList) if (issue.state === "open" && issue.title === title) {
		await closeIssue(issue.number);
		logger.debug(`Issue closed, issueNo: ${issue.number}`);
	}
}
async function tryAddMilestone(issueNo, milestoneNo) {
	if (!milestoneNo) return;
	logger.debug({
		milestone: milestoneNo,
		pr: issueNo
	}, "Adding milestone to PR");
	try {
		const repo = config.parentRepo ?? config.repository;
		const { body: updatedIssue } = await githubApi.patchJson(`repos/${repo}/issues/${issueNo}`, { body: { milestone: milestoneNo } }, GithubIssue);
		GithubIssueCache.updateIssue(updatedIssue);
	} catch (err) {
		/* v8 ignore next -- defensive: the raw-error fallback is for non-HTTP failures not seen in specs */
		const actualError = err.response?.body ?? err;
		logger.warn({
			milestone: milestoneNo,
			pr: issueNo,
			err: actualError
		}, "Unable to add milestone to PR");
	}
}
async function addAssignees(issueNo, assignees) {
	logger.debug(`Adding assignees '${assignees.join(", ")}' to #${issueNo}`);
	const url = `repos/${config.parentRepo ?? config.repository}/issues/${issueNo}/assignees`;
	let lastErr;
	for (let attempt = 0; attempt < 3; attempt += 1) try {
		const { body: updatedIssue } = await githubApi.postJson(url, { body: { assignees } }, GithubIssue);
		GithubIssueCache.updateIssue(updatedIssue);
		return;
	} catch (err) {
		if (err.statusCode !== 404) throw err;
		lastErr = err;
		logger.debug({ attempt: attempt + 1 }, `Retrying addAssignees for #${issueNo} after 404`);
		await setTimeout(1e3);
	}
	throw lastErr;
}
async function addReviewers(prNo, reviewers) {
	logger.debug(`Adding reviewers '${reviewers.join(", ")}' to #${prNo}`);
	const userReviewers = reviewers.filter((e) => !e.startsWith("team:"));
	const teamReviewers = reviewers.filter((e) => e.startsWith("team:")).map((e) => e.replace(regEx(/^team:/), ""));
	try {
		await githubApi.postJson(`repos/${config.parentRepo ?? config.repository}/pulls/${prNo}/requested_reviewers`, { body: {
			reviewers: userReviewers,
			team_reviewers: teamReviewers
		} });
	} catch (err) /* v8 ignore next -- defensive: reviewer assignment failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Failed to assign reviewer");
	}
}
async function addLabels(issueNo, labels) {
	logger.debug(`Adding labels '${labels?.join(", ")}' to #${issueNo}`);
	try {
		const repository = config.parentRepo ?? config.repository;
		if (isArray(labels) && labels.length) await githubApi.postJson(`repos/${repository}/issues/${issueNo}/labels`, { body: labels });
	} catch (err) /* v8 ignore next -- defensive: label-adding failures are logged and swallowed, not simulated in specs */ {
		logger.warn({
			err,
			issueNo,
			labels
		}, "Error while adding labels. Skipping");
	}
}
async function deleteLabel(issueNo, label) {
	logger.debug(`Deleting label ${label} from #${issueNo}`);
	const repository = config.parentRepo ?? config.repository;
	try {
		await githubApi.deleteJson(`repos/${repository}/issues/${issueNo}/labels/${label}`);
	} catch (err) /* v8 ignore next -- defensive: label deletion failures are logged and swallowed, not simulated in specs */ {
		logger.warn({
			err,
			issueNo,
			label
		}, "Failed to delete label");
	}
}
async function addComment(issueNo, body) {
	await githubApi.postJson(`repos/${config.parentRepo ?? config.repository}/issues/${issueNo}/comments`, { body: { body } });
}
async function editComment(commentId, body) {
	await githubApi.patchJson(`repos/${config.parentRepo ?? config.repository}/issues/comments/${commentId}`, { body: { body } });
}
async function deleteComment(commentId) {
	await githubApi.deleteJson(`repos/${config.parentRepo ?? config.repository}/issues/comments/${commentId}`);
}
async function getComments(issueNo) {
	logger.debug(`Getting comments for #${issueNo}`);
	const url = `repos/${config.parentRepo ?? config.repository}/issues/${issueNo}/comments?per_page=100`;
	try {
		const { body: comments } = await githubApi.getJsonUnchecked(url, {
			paginate: true,
			cacheProvider: repoCacheProvider
		});
		logger.debug(`Found ${comments.length} comments`);
		return comments;
	} catch (err) /* v8 ignore next -- comment-fetch 404s are wrapped as ExternalHostError, not mocked in specs */ {
		if (err.statusCode === 404) {
			logger.debug("404 response when retrieving comments");
			throw new ExternalHostError(err, "github");
		}
		throw err;
	}
}
async function ensureComment({ number, topic, content }) {
	const sanitizedContent = sanitize(content);
	try {
		const comments = await getComments(number);
		let body;
		let commentId = null;
		let commentNeedsUpdating = false;
		if (topic) {
			logger.debug(`Ensuring comment "${topic}" in #${number}`);
			body = `### ${topic}\n\n${sanitizedContent}`;
			comments.forEach((comment) => {
				if (comment.body.startsWith(`### ${topic}\n\n`)) {
					commentId = comment.id;
					commentNeedsUpdating = comment.body !== body;
				}
			});
		} else {
			logger.debug(`Ensuring content-only comment in #${number}`);
			body = `${sanitizedContent}`;
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
			logger.info({
				repository: config.repository,
				issueNo: number,
				topic
			}, "Comment added");
		} else if (commentNeedsUpdating) {
			await editComment(commentId, body);
			logger.debug({
				repository: config.repository,
				issueNo: number
			}, "Comment updated");
		} else logger.debug("Comment is already up-to-date");
		return true;
	} catch (err) /* v8 ignore next -- comment API failure handling (locked issues) is not mocked in specs */ {
		if (err instanceof ExternalHostError) throw err;
		if (err.body?.message?.includes("is locked")) logger.debug("Issue is locked - cannot add comment");
		else logger.warn({ err }, "Error ensuring comment");
		return false;
	}
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
	logger.trace(`Ensuring comment "${key}" in #${issueNo} is removed`);
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
	try {
		// v8 ignore else -- TODO: add test #40625
		if (commentId) {
			logger.debug(`Removing comment from issueNo: ${issueNo}`);
			await deleteComment(commentId);
		}
	} catch (err) /* v8 ignore next -- defensive: comment deletion failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Error deleting comment");
	}
}
async function tryPrAutomerge(prNumber, prNodeId, platformPrOptions) {
	if (!platformPrOptions?.usePlatformAutomerge) return;
	if (isGithubEnterpriseServer(platformConfig.host) && semver.satisfies(platformConfig.host.version ?? "", "<3.3.0")) {
		logger.debug({ prNumber }, "GitHub-native automerge: not supported on this version of GHE. Use 3.3.0 or newer.");
		return;
	}
	if (!config.autoMergeAllowed) {
		logger.debug({ prNumber }, "GitHub-native automerge: not enabled in repo settings");
		return;
	}
	try {
		const mergeMethod = (mapMergeStartegy(platformPrOptions.automergeStrategy) ?? config.mergeMethod)?.toUpperCase() || "MERGE";
		let commitHeadline;
		let commitBody;
		const automergeCommitMessage = platformPrOptions?.automergeCommitMessage;
		if (mergeMethod !== "REBASE" && automergeCommitMessage) {
			const newlineIndex = automergeCommitMessage.indexOf("\n");
			if (newlineIndex === -1) commitHeadline = automergeCommitMessage;
			else {
				commitHeadline = automergeCommitMessage.slice(0, newlineIndex);
				commitBody = automergeCommitMessage.slice(newlineIndex + 1).trim();
			}
			commitHeadline = `${commitHeadline} (#${prNumber})`;
		}
		const queryOptions = {
			variables: {
				pullRequestId: prNodeId,
				mergeMethod,
				commitHeadline,
				commitBody
			},
			count: 1
		};
		const res = await githubApi.requestGraphql(enableAutoMergeMutation, queryOptions);
		if (res?.errors) {
			logger.debug({
				prNumber,
				errors: res.errors
			}, "GitHub-native automerge: fail");
			return;
		}
		logger.debug(`GitHub-native automerge: success...PrNo: ${prNumber}`);
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		logger.warn({
			prNumber,
			err
		}, "GitHub-native automerge: REST API error");
	}
}
async function createPr({ sourceBranch, targetBranch, prTitle: title, prBody: rawBody, labels, draftPR = false, platformPrOptions, milestone }) {
	const body = sanitize(rawBody);
	const base = targetBranch;
	const head = `${config.repository.split("/")[0]}:${sourceBranch}`;
	const options = { body: {
		title,
		head,
		base,
		body,
		draft: draftPR
	} };
	/* v8 ignore next -- fork mode is not exercised in createPr specs */
	if (config.forkToken) {
		options.token = config.forkToken;
		options.body.maintainer_can_modify = !config.forkOrg && platformPrOptions?.forkModeDisallowMaintainerEdits !== true;
	}
	logger.debug({
		title,
		head,
		base,
		draft: draftPR
	}, "Creating PR");
	const ghPr = (await githubApi.postJson(`repos/${config.parentRepo ?? config.repository}/pulls`, options)).body;
	logger.debug({
		branch: sourceBranch,
		pr: ghPr.number,
		draft: draftPR
	}, "PR created");
	const result = coerceRestPr(ghPr);
	const { number, node_id } = result;
	await addLabels(number, labels);
	await tryAddMilestone(number, milestone);
	await tryPrAutomerge(number, node_id, platformPrOptions);
	cachePr(result);
	return result;
}
async function isBranchMergeQueueEnabled(baseBranch) {
	const cachedResult = config.mergeQueueEnabled[baseBranch];
	if (cachedResult !== void 0) return cachedResult;
	if (isGithubEnterpriseServer(platformConfig.host) && semver.satisfies(platformConfig.host.version ?? "", "<3.12.0")) {
		config.mergeQueueEnabled[baseBranch] = false;
		return false;
	}
	let result = true;
	try {
		const res = await githubApi.requestGraphql(repoMergeQueueQuery, {
			variables: {
				owner: config.repositoryOwner,
				name: config.repositoryName,
				branch: baseBranch
			},
			readOnly: true,
			count: 1
		});
		if (res?.errors) logger.debug({
			baseBranch,
			errors: res.errors
		}, "Failed to fetch merge queue status - assuming merge queue is enabled");
		else result = isNonEmptyObject(res?.data?.repository?.mergeQueue);
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		logger.debug({
			baseBranch,
			err
		}, "Error fetching merge queue status - assuming merge queue is enabled");
	}
	config.mergeQueueEnabled[baseBranch] = result;
	return result;
}
function isPrInMergeQueue(prNo) {
	return isPrInMergeQueue$1(githubApi, config.repositoryOwner, config.repositoryName, prNo);
}
async function assertPrNotInMergeQueue(branchName, baseBranch) {
	if (!await isBranchMergeQueueEnabled(baseBranch ?? config.defaultBranch)) return;
	const pr = await findPr({
		branchName,
		state: "open"
	});
	if (!pr) return;
	if (await isPrInMergeQueue(pr.number)) {
		logger.debug(`PR #${pr.number} is in the merge queue - aborting push`);
		throw new Error(PR_ALREADY_IN_MERGE_QUEUE);
	}
}
async function updatePr({ number: prNo, prTitle: title, prBody: rawBody, addLabels: labelsToAdd, removeLabels, state, targetBranch }) {
	logger.debug(`updatePr(${prNo}, ${title}, body)`);
	const body = sanitize(rawBody);
	const patchBody = { title };
	// v8 ignore else -- TODO: add test #40625
	if (body) patchBody.body = body;
	if (targetBranch) patchBody.base = targetBranch;
	if (state) patchBody.state = state;
	const options = { body: patchBody };
	/* v8 ignore next -- fork mode is not exercised in updatePr specs */
	if (config.forkToken) options.token = config.forkToken;
	try {
		if (labelsToAdd) await addLabels(prNo, labelsToAdd);
		if (removeLabels) for (const label of removeLabels) await deleteLabel(prNo, label);
		const { body: ghPr } = await githubApi.patchJson(`repos/${config.parentRepo ?? config.repository}/pulls/${prNo}`, options);
		cachePr(coerceRestPr(ghPr));
		logger.debug(`PR updated...prNo: ${prNo}`);
	} catch (err) /* v8 ignore next -- non-host update failures are logged and swallowed, not mocked in specs */ {
		if (err instanceof ExternalHostError) throw err;
		logger.warn({ err }, "Error updating PR");
	}
}
async function reattemptPlatformAutomerge({ number, platformPrOptions }) {
	try {
		const { node_id } = await getPr(number);
		await tryPrAutomerge(number, node_id, platformPrOptions);
		logger.debug(`PR platform automerge re-attempted...prNo: ${number}`);
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		logger.warn({ err }, "Error re-attempting PR platform automerge");
	}
}
async function tryEnqueuePr(pr) {
	const prNo = pr.number;
	try {
		const res = await githubApi.requestGraphql(enqueuePullRequestMutation, {
			variables: { pullRequestId: pr.node_id },
			count: 1
		});
		if (res?.errors) {
			if (res.errors.some((error) => regEx(/already.*queue/i).test(error.message))) {
				logger.debug(`PR #${prNo} is already in the merge queue`);
				return true;
			}
			logger.debug({
				prNumber: prNo,
				errors: res.errors
			}, "Failed to add PR to the merge queue");
			return false;
		}
		logger.debug(`PR #${prNo} added to the merge queue`);
		return true;
	} catch (err) {
		logger.warn({
			prNumber: prNo,
			err
		}, "Failed to add PR to the merge queue");
		return false;
	}
}
async function mergePr({ branchName, id: prNo, strategy }) {
	logger.debug(`mergePr(${prNo}, ${branchName})`);
	const pr = await getPr(prNo);
	if (await directMergePr(prNo, strategy)) return true;
	if (pr?.targetBranch && await isBranchMergeQueueEnabled(pr.targetBranch)) return tryEnqueuePr(pr);
	return false;
}
async function directMergePr(prNo, strategy) {
	const url = `repos/${config.parentRepo ?? config.repository}/pulls/${prNo}/merge`;
	const options = { body: {} };
	/* v8 ignore next -- fork mode is not exercised in mergePr specs */
	if (config.forkToken) options.token = config.forkToken;
	let automerged = false;
	let automergeResult;
	const mergeStrategy = mapMergeStartegy(strategy) ?? config.mergeMethod;
	// v8 ignore else -- TODO: add test #40625
	if (mergeStrategy) {
		options.body.merge_method = mergeStrategy;
		try {
			logger.debug({
				options,
				url
			}, `mergePr`);
			automergeResult = await githubApi.putJson(url, options);
			automerged = true;
		} catch (err) /* v8 ignore next -- merge rejection handling (404/405 status-check bodies) is not fully mocked in specs */ {
			if (err.statusCode === 404 || err.statusCode === 405) {
				const body = err.response?.body;
				if (isNonEmptyString(body?.message) && regEx(/^Required status check ".+" is expected\.$/).test(body.message)) {
					logger.debug({ response: body }, `GitHub blocking PR merge -- Missing required status check(s)`);
					return false;
				}
				if (isNonEmptyString(body?.message) && (body.message.includes("approving review") || body.message.includes("code owner review") || body.message.includes("New changes require approval from someone other than the last pusher"))) {
					logger.debug({ response: body }, `GitHub blocking PR merge -- Needs approving review(s)`);
					return false;
				}
				logger.debug({ response: body }, "GitHub blocking PR merge -- will keep trying");
			} else {
				logger.warn({
					mergeMethod: config.mergeMethod,
					err
				}, "Failed to merge PR");
				return false;
			}
		}
	}
	if (!automerged) {
		options.body.merge_method = "squash";
		try {
			logger.debug({
				options,
				url
			}, `mergePr`);
			automergeResult = await githubApi.putJson(url, options);
		} catch (err1) {
			logger.debug({ err: err1 }, `Failed to squash merge PR`);
			try {
				options.body.merge_method = "merge";
				logger.debug({
					options,
					url
				}, `mergePr`);
				automergeResult = await githubApi.putJson(url, options);
			} catch (err2) {
				logger.debug({ err: err2 }, `Failed to merge commit PR`);
				try {
					options.body.merge_method = "rebase";
					logger.debug({
						options,
						url
					}, `mergePr`);
					automergeResult = await githubApi.putJson(url, options);
				} catch (err3) {
					logger.debug({ err: err3 }, `Failed to rebase merge PR`);
					logger.info({ pr: prNo }, "All merge attempts failed");
					return false;
				}
			}
		}
	}
	logger.debug({
		automergeResult: automergeResult.body,
		pr: prNo
	}, "PR merged");
	const cachedPr = config.prList?.find(({ number }) => number === prNo);
	if (cachedPr) cachePr({
		...cachedPr,
		state: "merged"
	});
	return true;
}
function massageMarkdown(input) {
	if (platformConfig.host.type !== "github") return smartTruncate(input, maxBodyLength());
	const massagedInput = massageMarkdownLinks(input).replace(regEx(/href="https?:\/\/github.com\//g), "href=\"https://redirect.github.com/").replace(regEx(/]\(https:\/\/github\.com\//g), "](https://redirect.github.com/").replace(regEx(/]: https:\/\/github\.com\//g), "]: https://redirect.github.com/").replaceAll("> ℹ **Note**\n> \n", "> [!NOTE]\n").replaceAll("> ℹ️ **Note**\n> \n", "> [!NOTE]\n").replaceAll("> ⚠ **Warning**\n> \n", "> [!WARNING]\n").replaceAll("> ⚠️ **Warning**\n> \n", "> [!WARNING]\n").replaceAll("> ❗ **Caution**\n> \n", "> [!CAUTION]\n").replaceAll("> ❗ **Important**\n> \n", "> [!IMPORTANT]\n");
	return smartTruncate(massagedInput, maxBodyLength());
}
function maxBodyLength() {
	return GitHubMaxPrBodyLen;
}
async function getVulnerabilityAlerts() {
	/* v8 ignore next -- specs initialize repos with vulnerability alerts enabled */
	if (config.hasVulnerabilityAlertsEnabled === false) {
		logger.debug("No vulnerability alerts enabled for repo");
		return [];
	}
	let vulnerabilityAlerts;
	try {
		vulnerabilityAlerts = (await githubApi.getJson(`/repos/${config.repositoryOwner}/${config.repositoryName}/dependabot/alerts?state=open&direction=asc&per_page=100`, {
			paginate: true,
			headers: { accept: "application/vnd.github+json" },
			cacheProvider: repoCacheProvider
		}, GithubVulnerabilityAlerts)).body;
	} catch (err) /* v8 ignore next -- alert-permission failures are logged and swallowed, not mocked in specs */ {
		logger.debug({ err }, "Error retrieving vulnerability alerts");
		logger.warn({ url: `${GlobalConfig.get("productLinks").documentation}configuration-options/#vulnerabilityalerts` }, "Cannot access vulnerability alerts. Please ensure permissions have been granted.");
	}
	try {
		if (vulnerabilityAlerts?.length) {
			const shortAlerts = {};
			logger.trace({ alerts: vulnerabilityAlerts }, "GitHub vulnerability details");
			for (const alert of vulnerabilityAlerts) {
				// v8 ignore if -- TODO: can never happen but makes typescript happy #40625
				if (alert.security_vulnerability === null) continue;
				const { package: { name, ecosystem }, vulnerable_version_range: vulnerableVersionRange, first_patched_version: firstPatchedVersion } = alert.security_vulnerability;
				const patch = firstPatchedVersion?.identifier;
				const normalizedName = ecosystem === "pip" ? normalizePythonDepName(name) : name;
				alert.security_vulnerability.package.name = normalizedName;
				const key = `${ecosystem.toLowerCase()}/${normalizedName}`;
				const range = vulnerableVersionRange;
				const elem = shortAlerts[key] || {};
				elem[range] = coerceToNull(patch);
				shortAlerts[key] = elem;
			}
			logger.debug({ alerts: shortAlerts }, "GitHub vulnerability details");
		} else logger.debug("No vulnerability alerts found");
	} catch (err) /* v8 ignore next -- defensive: processing already-parsed alerts does not throw in specs */ {
		logger.error({ err }, "Error processing vulnerabity alerts");
	}
	return coerceArray(vulnerabilityAlerts);
}
async function pushFiles({ branchName, message, trailers }, { parentCommitSha, commitSha }) {
	try {
		await pushCommitToRenovateRef(commitSha, branchName);
		const baseTreeSha = await getCommitTreeSha(parentCommitSha);
		const treeItems = await diffCommitTree(parentCommitSha, commitSha);
		if (treeItems.length === 0) {
			logger.debug({ branchName }, "Platform-native commit: no changed files between commits");
			return null;
		}
		const treeSha = (await githubApi.postJson(`/repos/${config.repository}/git/trees`, { body: {
			base_tree: baseTreeSha,
			tree: treeItems
		} })).body.sha;
		const commitMessage = formatCommitMessage(message, trailers);
		const commitRes = await githubApi.postJson(`/repos/${config.repository}/git/commits`, { body: {
			message: commitMessage,
			tree: treeSha,
			parents: [parentCommitSha]
		} });
		incLimitedValue("Commits");
		const remoteCommitSha = toLongCommitSha(commitRes.body.sha);
		await ensureBranchSha(branchName, remoteCommitSha);
		return remoteCommitSha;
	} catch (err) {
		logger.debug({
			branchName,
			err
		}, "Platform-native commit: unknown error");
		return null;
	}
}
async function commitFiles(config) {
	const commitResult = await prepareCommit(config);
	const { branchName, files } = config;
	if (!commitResult) {
		logger.debug({
			branchName,
			files: files.map(({ path }) => path)
		}, `Platform-native commit: unable to prepare for commit`);
		return null;
	}
	if (!await pushFiles(config, commitResult)) return null;
	await resetToCommit(commitResult.parentCommitSha);
	return await fetchBranch(branchName);
}
//#endregion
export { addAssignees, addLabels, addReviewers, assertPrNotInMergeQueue, commitFiles, createFork, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findFork, findIssue, findPr, getBranchForceRebase, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, getVulnerabilityAlerts, github_exports, id, initPlatform, initRepo, isBranchMergeQueueEnabled, isGHApp, isPrInMergeQueue, listForks, massageMarkdown, maxBodyLength, mergePr, reattemptPlatformAutomerge, resetConfigs, setBranchStatus, tryReuseAutoclosedPr, updatePr };

//# sourceMappingURL=index.js.map