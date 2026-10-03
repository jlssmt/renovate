import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { REPOSITORY_ACCESS_FORBIDDEN, REPOSITORY_ARCHIVED, REPOSITORY_BLOCKED, REPOSITORY_CHANGED, REPOSITORY_EMPTY, REPOSITORY_MIRRORED } from "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray, deduplicateArray } from "../../../util/array.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts } from "../../../util/url.js";
import { parseJson } from "../../../util/common.js";
import { map } from "../../../util/promises.js";
import { getBranchCommit, initRepo as initRepo$1 } from "../../../util/git/index.js";
import { GiteaHttp, setBaseUrl } from "../../../util/http/gitea.js";
import { getPrBodyStruct, hashBody } from "../pr-body.js";
import { repoFingerprint } from "../util.js";
import { smartTruncate } from "../utils/pr-body.js";
import { PRMergeMethod } from "./schema.js";
import { getRepoFile } from "./files.js";
import { API_PATH, DRAFT_PREFIX, getMergeMethod, getRepoUrl, isAllowed, platformDisplayName, smartLinks, toRenovatePR, trimTrailingApiPath, usableRepo } from "./utils.js";
import { closeIssue, createComment, createCommitStatus, createIssue, createPR, deleteComment, getCombinedCommitStatus, getComments, getCurrentUser, getIssue as getIssue$1, getPR, getPRByBranch, getRepo, getVersion, isOrg, mergePR, orgListRepos, requestPrReviewers, searchIssues, searchRepos, toPlatformStatusMapping, toRenovateStatusMapping, unassignLabel, updateComment, updateIssue, updateIssueLabels, updatePR } from "./gitea-helper.js";
import { lookupLabelByName } from "./labels.js";
import { GiteaPrCache } from "./pr-cache.js";
import { isNumber, isString } from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/platform/gitea/index.ts
var gitea_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPlatform: () => createPlatform,
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
	getIssue: () => getIssue,
	getIssueList: () => getIssueList,
	getJsonFile: () => getJsonFile,
	getPr: () => getPr,
	getPrList: () => getPrList,
	getRawFile: () => getRawFile,
	getRepos: () => getRepos,
	giteaHttp: () => giteaHttp,
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
const id = "gitea";
const giteaHttp = new GiteaHttp();
function toRenovateIssue(data) {
	return {
		number: data.number,
		state: data.state,
		title: data.title,
		body: data.body
	};
}
function matchesState(actual, expected) {
	if (expected === "all") return true;
	if (expected.startsWith("!")) return actual !== expected.substring(1);
	return actual === expected;
}
function findCommentByTopic(comments, topic) {
	return comments.find((c) => c.body.startsWith(`### ${topic}\n\n`)) ?? null;
}
function findCommentByContent(comments, content) {
	return comments.find((c) => c.body.trim() === content) ?? null;
}
/**
* Builds the platform implementation shared by every platform which speaks the
* Gitea API. Each call owns its own module state, so `gitea` and `forgejo` do
* not share caches or configuration.
*/
function createPlatform(options) {
	const { id, http, setBaseUrl, logDetectedVersion, checkNativeAutomerge, minReviewerVersion } = options;
	const name = platformDisplayName[id];
	const defaults = {
		endpoint: options.defaultEndpoint,
		version: "0.0.0"
	};
	let config = {};
	let botUserID;
	let botUserName;
	const prCache = new GiteaPrCache(http, id);
	function resetPlatform() {
		config = {};
		prCache.reset();
		botUserID = void 0;
		botUserName = void 0;
		defaults.endpoint = options.defaultEndpoint;
		defaults.version = "0.0.0";
		setBaseUrl(defaults.endpoint);
	}
	async function fetchIssueList() {
		const issueList = (await searchIssues(http, config.repository, { state: "all" }, { memCache: false })).map(toRenovateIssue);
		logger.debug(`Retrieved ${issueList.length} Issues`);
		return issueList;
	}
	async function fetchRepositories({ topic, sort, order }) {
		return (await searchRepos(http, {
			uid: botUserID,
			archived: false,
			...topic && {
				topic: true,
				q: topic
			},
			...sort && { sort },
			...order && { order }
		})).filter(usableRepo).map((r) => r.full_name);
	}
	const platform = {
		async initPlatform({ endpoint, token }) {
			if (!token) throw new Error(`Init: You must configure a ${name} personal access token`);
			if (endpoint) {
				let baseEndpoint = trimTrailingApiPath(endpoint);
				baseEndpoint = ensureTrailingSlash(baseEndpoint);
				defaults.endpoint = baseEndpoint;
			} else logger.debug(`Using default ${name} endpoint: ${defaults.endpoint}`);
			setBaseUrl(defaults.endpoint);
			let gitAuthor;
			try {
				const user = await getCurrentUser(http, { token });
				gitAuthor = `${user.full_name || user.login} <${user.email}>`;
				botUserID = user.id;
				botUserName = user.login;
				const env = getEnv();
				/* v8 ignore if: experimental feature */
				if (semver.valid(env.RENOVATE_X_PLATFORM_VERSION)) defaults.version = env.RENOVATE_X_PLATFORM_VERSION;
				else defaults.version = await getVersion(http, { token });
				logDetectedVersion(defaults.version);
			} catch (err) {
				logger.debug({ err }, `Error authenticating with ${name}. Check your token`);
				throw new Error("Init: Authentication failure");
			}
			return {
				endpoint: defaults.endpoint,
				gitAuthor
			};
		},
		async getRawFile(fileName, repoName, branchOrTag) {
			const repo = repoName ?? config.repository;
			const contents = await getRepoFile(http, repo, fileName, branchOrTag, { baseUrl: joinUrlParts(defaults.endpoint, API_PATH) });
			if (contents.type !== "file") return null;
			return contents.contentString;
		},
		async getJsonFile(fileName, repoName, branchOrTag) {
			const raw = await platform.getRawFile(fileName, repoName, branchOrTag);
			return parseJson(raw, fileName);
		},
		async initRepo({ repository, cloneSubmodules, cloneSubmodulesFilter, gitUrl }) {
			let repo;
			config = {};
			config.repository = repository;
			config.cloneSubmodules = !!cloneSubmodules;
			config.cloneSubmodulesFilter = cloneSubmodulesFilter;
			config.ignorePrAuthor = GlobalConfig.get("ignorePrAuthor");
			try {
				repo = await getRepo(http, repository);
			} catch (err) {
				logger.debug({ err }, `Unknown ${name} initRepo error`);
				throw err;
			}
			if (repo.archived) {
				logger.debug("Repository is archived - aborting renovation");
				throw new Error(REPOSITORY_ARCHIVED);
			}
			if (repo.mirror) {
				logger.debug("Repository is a mirror - aborting renovation");
				throw new Error(REPOSITORY_MIRRORED);
			}
			if (!repo.permissions.pull || !repo.permissions.push) {
				logger.debug("Repository does not permit pull or push - aborting renovation");
				throw new Error(REPOSITORY_ACCESS_FORBIDDEN);
			}
			if (repo.empty) {
				logger.debug("Repository is empty - aborting renovation");
				throw new Error(REPOSITORY_EMPTY);
			}
			if (repo.has_pull_requests === false) {
				logger.debug("Repo has disabled pull requests - aborting renovation");
				throw new Error(REPOSITORY_BLOCKED);
			}
			const mergeStyle = [
				...repo.default_merge_style ? [repo.default_merge_style] : [],
				"fast-forward-only",
				"squash",
				"merge",
				"rebase",
				"rebase-merge"
			].find((style) => isAllowed(style, repo));
			if (mergeStyle) {
				config.mergeMethod = mergeStyle;
				config.allowedMergeMethods = new Set(PRMergeMethod.options.filter((style) => isAllowed(style, repo)));
			} else {
				logger.debug("Repository has no allowed merge methods - aborting renovation");
				throw new Error(REPOSITORY_BLOCKED);
			}
			try {
				config.isOrgRepo = await isOrg(http, id, repo.owner.login);
			} catch (err) {
				logger.debug({ err }, `${name} initRepo() error`);
				throw err;
			}
			config.defaultBranch = repo.default_branch;
			logger.debug(`${repository} default branch = ${config.defaultBranch}`);
			const url = getRepoUrl(repo, gitUrl, defaults.endpoint, id);
			await initRepo$1({
				...config,
				url
			});
			config.issueList = null;
			config.labelList = null;
			prCache.initRepo(config.repository, config.ignorePrAuthor, botUserName);
			config.hasIssuesEnabled = !repo.external_tracker && repo.has_issues;
			config.orgName = repo.owner.login;
			return {
				defaultBranch: config.defaultBranch,
				isFork: !!repo.fork,
				repoFingerprint: repoFingerprint(repo.id, defaults.endpoint)
			};
		},
		async getRepos(config) {
			logger.debug(`Auto-discovering ${name} repositories`);
			try {
				if (config?.topics) {
					logger.debug({ topics: config.topics }, "Auto-discovering by topics");
					const fetchRepoArgs = config.topics.map((topic) => {
						return {
							topic,
							sort: config.sort,
							order: config.order
						};
					});
					const repos = await map(fetchRepoArgs, fetchRepositories);
					return deduplicateArray(repos.flat());
				}
				if (config?.namespaces) {
					logger.debug({ namespaces: config.namespaces }, "Auto-discovering by organization");
					const repos = await map(config.namespaces, async (organization) => {
						return (await orgListRepos(http, organization)).filter((r) => !r.mirror && !r.archived).map((r) => r.full_name);
					});
					return deduplicateArray(repos.flat());
				}
				return await fetchRepositories({
					sort: config?.sort,
					order: config?.order
				});
			} catch (err) {
				logger.error({
					err,
					platform: id
				}, "Error auto-discovering repositories");
				throw err;
			}
		},
		async setBranchStatus({ branchName, context, description, state, url: target_url }) {
			try {
				const branchCommit = getBranchCommit(branchName);
				await createCommitStatus(http, config.repository, branchCommit, {
					state: toPlatformStatusMapping[state] || "pending",
					context,
					description,
					...target_url && { target_url }
				});
				await getCombinedCommitStatus(http, config.repository, branchName, { memCache: false });
			} catch (err) {
				logger.warn({ err }, "Failed to set branch status");
			}
		},
		async getBranchStatus(branchName, internalChecksAsSuccess) {
			let ccs;
			try {
				ccs = await getCombinedCommitStatus(http, config.repository, branchName);
			} catch (err) {
				if (err.statusCode === 404) {
					logger.debug("Received 404 when checking branch status, assuming branch deletion");
					throw new Error(REPOSITORY_CHANGED);
				}
				logger.debug("Unknown error when checking branch status");
				throw err;
			}
			logger.debug({ ccs }, "Branch status check result");
			if (!internalChecksAsSuccess && ccs.worstStatus === "success" && ccs.statuses.every((status) => status.context?.startsWith("renovate/"))) {
				logger.debug("Successful checks are all internal renovate/ checks, so returning \"pending\" branch status");
				return "yellow";
			}
			return toRenovateStatusMapping[ccs.worstStatus];
		},
		async getBranchStatusCheck(branchName, context) {
			const cs = (await getCombinedCommitStatus(http, config.repository, branchName)).statuses.find((s) => s.context === context);
			if (!cs) return null;
			return toRenovateStatusMapping[cs.status];
		},
		getPrList() {
			return prCache.getPrs();
		},
		async getPr(number) {
			let pr = (await platform.getPrList()).find((p) => p.number === number) ?? null;
			if (pr) logger.debug("Returning from cached PRs");
			else {
				logger.debug("PR not found in cached PRs - trying to fetch directly");
				const gpr = await getPR(http, config.repository, number);
				pr = toRenovatePR(gpr, botUserName);
				if (pr) await prCache.setPr(pr);
			}
			if (!pr) return null;
			return pr;
		},
		async findPr({ branchName, prTitle: title, state = "all", includeOtherAuthors, targetBranch }) {
			logger.debug(`findPr(${branchName}, ${title}, ${state})`);
			if (includeOtherAuthors && isString(targetBranch)) {
				const pr = await getPRByBranch(http, config.repository, targetBranch, branchName);
				if (!pr) return null;
				return toRenovatePR(pr, null);
			}
			const pr = (await platform.getPrList()).find((p) => p.sourceRepo === config.repository && p.sourceBranch === branchName && matchesState(p.state, state) && (!title || p.title === title));
			if (pr) logger.debug(`Found PR #${pr.number}`);
			return pr ?? null;
		},
		async createPr({ sourceBranch, targetBranch, prTitle, prBody: rawBody, labels: labelNames, platformPrOptions, draftPR }) {
			let title = prTitle;
			const base = targetBranch;
			const head = sourceBranch;
			const body = sanitize(rawBody);
			if (draftPR) title = DRAFT_PREFIX + title;
			logger.debug(`Creating pull request: ${title} (${head} => ${base})`);
			try {
				const labels = Array.isArray(labelNames) ? await map(labelNames, (name) => lookupLabelByName(http, config, name)) : [];
				const gpr = await createPR(http, config.repository, {
					base,
					head,
					title,
					body,
					labels: labels.filter(isNumber)
				});
				if (platformPrOptions?.usePlatformAutomerge) {
					const unsupportedReason = checkNativeAutomerge(defaults.version);
					if (unsupportedReason === null) try {
						await mergePR(http, config.repository, gpr.number, {
							Do: getMergeMethod(platformPrOptions?.automergeStrategy, config.allowedMergeMethods) ?? config.mergeMethod,
							merge_when_checks_succeed: true,
							delete_branch_after_merge: true
						});
						logger.debug({ prNumber: gpr.number }, `${name}-native automerge: success`);
					} catch (err) {
						logger.warn({
							err,
							prNumber: gpr.number,
							platform: id
						}, "Platform-native automerge: fail");
					}
					else logger.debug({ prNumber: gpr.number }, unsupportedReason);
				}
				const pr = toRenovatePR(gpr, botUserName);
				if (!pr) throw new Error("Can not parse newly created Pull Request");
				await prCache.setPr(pr);
				return pr;
			} catch (err) {
				if (err.statusCode === 409) {
					logger.warn({
						prTitle: title,
						sourceBranch
					}, "Attempting to gracefully recover from 409 Conflict response in createPr()");
					prCache.forceSync();
					const pr = await platform.findPr({
						branchName: sourceBranch,
						state: "open"
					});
					// v8 ignore else -- TODO: add test #40625
					if (pr?.bodyStruct) {
						if (pr.title !== title || pr.bodyStruct.hash !== hashBody(body)) {
							logger.debug(`Recovered from 409 Conflict, but PR for ${sourceBranch} is outdated. Updating...`);
							await platform.updatePr({
								number: pr.number,
								prTitle: title,
								prBody: body
							});
							pr.title = title;
							pr.bodyStruct = getPrBodyStruct(body);
						} else logger.debug(`Recovered from 409 Conflict and PR for ${sourceBranch} is up-to-date`);
						return pr;
					}
				}
				throw err;
			}
		},
		async updatePr({ number, prTitle, prBody: body, labels, state, targetBranch }) {
			let title = prTitle;
			if ((await platform.getPrList()).find((pr) => pr.number === number)?.isDraft) title = DRAFT_PREFIX + title;
			const prUpdateParams = {
				title,
				...body && { body },
				...state && { state }
			};
			if (targetBranch) prUpdateParams.base = targetBranch;
			/**
			* Update PR labels.
			* In the Gitea API, labels are replaced on each update if the field is present.
			* If the field is not present (i.e., undefined), labels aren't updated.
			* However, the labels array must contain label IDs instead of names,
			* so a lookup is performed to fetch the details (including the ID) of each label.
			*/
			if (Array.isArray(labels)) {
				prUpdateParams.labels = (await map(labels, (name) => lookupLabelByName(http, config, name))).filter(isNumber);
				if (labels.length !== prUpdateParams.labels.length) logger.warn("Some labels could not be looked up. Renovate may halt label updates assuming changes by others.");
			}
			const gpr = await updatePR(http, config.repository, number, prUpdateParams);
			const pr = toRenovatePR(gpr, botUserName);
			if (pr) await prCache.setPr(pr);
		},
		async mergePr({ id: prNumber, strategy }) {
			try {
				await mergePR(http, config.repository, prNumber, { Do: getMergeMethod(strategy, config.allowedMergeMethods) ?? config.mergeMethod });
				return true;
			} catch (err) {
				logger.warn({
					err,
					id: prNumber
				}, "Merging of PR failed");
				return false;
			}
		},
		getIssueList() {
			if (config.hasIssuesEnabled === false) return Promise.resolve([]);
			config.issueList ??= fetchIssueList();
			return config.issueList;
		},
		async getIssue(number, memCache = true) {
			if (config.hasIssuesEnabled === false) return null;
			try {
				return {
					number,
					body: (await getIssue$1(http, config.repository, number, { memCache })).body
				};
			} catch (err) {
				logger.debug({
					err,
					number
				}, "Error getting issue");
				return null;
			}
		},
		async findIssue(title) {
			const issue = (await platform.getIssueList()).find((i) => i.state === "open" && i.title === title);
			if (!issue) return null;
			logger.debug(`Found Issue #${issue.number}`);
			return platform.getIssue(issue.number);
		},
		async ensureIssue({ title, reuseTitle, body: content, labels: labelNames, shouldReOpen, once }) {
			logger.debug(`ensureIssue(${title})`);
			if (config.hasIssuesEnabled === false) {
				logger.info("Cannot ensure issue because issues are disabled in this repository");
				return null;
			}
			try {
				const body = smartLinks(content);
				const issueList = await platform.getIssueList();
				let issues = issueList.filter((i) => i.title === title);
				if (!issues.length) issues = issueList.filter((i) => i.title === reuseTitle);
				const labels = Array.isArray(labelNames) ? (await Promise.all(labelNames.map((name) => lookupLabelByName(http, config, name)))).filter(isNumber) : void 0;
				if (issues.length) {
					let activeIssue = issues.find((i) => i.state === "open");
					if (!activeIssue) {
						if (once) {
							logger.debug("Issue already closed - skipping update");
							return null;
						}
						if (shouldReOpen) logger.debug("Reopening previously closed Issue");
						activeIssue = issues.at(-1);
					}
					for (const issue of issues) if (issue.state === "open" && issue.number !== activeIssue.number) {
						logger.warn({ issueNo: issue.number }, "Closing duplicate issue");
						await closeIssue(http, config.repository, issue.number);
					}
					if (activeIssue.title === title && activeIssue.body === body && activeIssue.state === "open") {
						logger.debug(`Issue #${activeIssue.number} is open and up to date - nothing to do`);
						return null;
					}
					if (shouldReOpen || activeIssue.state === "open") {
						logger.debug(`Updating Issue #${activeIssue.number}`);
						const existingIssue = await updateIssue(http, config.repository, activeIssue.number, {
							body,
							title,
							state: "open"
						});
						const existingLabelIds = coerceArray(existingIssue.labels).map((label) => label.id);
						if (labels && (labels.length !== existingLabelIds.length || labels.filter((labelId) => !existingLabelIds.includes(labelId)).length !== 0)) await updateIssueLabels(http, config.repository, activeIssue.number, { labels });
						return "updated";
					}
				}
				const issue = await createIssue(http, config.repository, {
					body,
					title,
					labels
				});
				logger.debug(`Created new Issue #${issue.number}`);
				config.issueList = null;
				return "created";
			} catch (err) {
				logger.warn({ err }, "Could not ensure issue");
			}
			return null;
		},
		async ensureIssueClosing(title) {
			logger.debug(`ensureIssueClosing(${title})`);
			if (config.hasIssuesEnabled === false) return;
			const issueList = await platform.getIssueList();
			for (const issue of issueList) if (issue.state === "open" && issue.title === title) {
				logger.debug(`Closing issue...issueNo: ${issue.number}`);
				await closeIssue(http, config.repository, issue.number);
			}
		},
		async deleteLabel(issue, labelName) {
			logger.debug(`Deleting label ${labelName} from Issue #${issue}`);
			const label = await lookupLabelByName(http, config, labelName);
			if (label) await unassignLabel(http, config.repository, issue, label);
			else logger.warn({
				issue,
				labelName
			}, "Failed to lookup label for deletion");
		},
		async ensureComment({ number: issue, topic, content }) {
			try {
				let body = sanitize(content);
				const commentList = await getComments(http, config.repository, issue);
				let comment = null;
				if (topic) {
					comment = findCommentByTopic(commentList, topic);
					body = `### ${topic}\n\n${body}`;
				} else comment = findCommentByContent(commentList, body);
				if (!comment) {
					comment = await createComment(http, config.repository, issue, body);
					logger.info({
						repository: config.repository,
						issue,
						comment: comment.id
					}, "Comment added");
				} else if (comment.body === body) logger.debug(`Comment #${comment.id} is already up-to-date`);
				else {
					await updateComment(http, config.repository, comment.id, body);
					logger.debug({
						repository: config.repository,
						issue,
						comment: comment.id
					}, "Comment updated");
				}
				return true;
			} catch (err) {
				logger.warn({
					err,
					issue,
					subject: topic
				}, "Error ensuring comment");
				return false;
			}
		},
		async ensureCommentRemoval(deleteConfig) {
			const { number: issue } = deleteConfig;
			const key = deleteConfig.type === "by-topic" ? deleteConfig.topic : deleteConfig.content;
			logger.debug(`Ensuring comment "${key}" in #${issue} is removed`);
			const commentList = await getComments(http, config.repository, issue);
			let comment = null;
			// v8 ignore else -- TODO: add test #40625
			if (deleteConfig.type === "by-topic") comment = findCommentByTopic(commentList, deleteConfig.topic);
			else if (deleteConfig.type === "by-content") comment = findCommentByContent(commentList, sanitize(deleteConfig.content));
			if (!comment) return;
			try {
				await deleteComment(http, config.repository, comment.id);
			} catch (err) {
				logger.warn({
					err,
					issue,
					config: deleteConfig
				}, "Error deleting comment");
			}
		},
		async getBranchPr(branchName) {
			logger.debug(`getBranchPr(${branchName})`);
			const pr = await platform.findPr({
				branchName,
				state: "open"
			});
			return pr ? platform.getPr(pr.number) : null;
		},
		async addAssignees(number, assignees) {
			logger.debug(`Updating assignees '${assignees?.join(", ")}' on Issue #${number}`);
			await updateIssue(http, config.repository, number, { assignees });
		},
		async addReviewers(number, reviewers) {
			logger.debug(`Adding reviewers '${reviewers?.join(", ")}' to #${number}`);
			if (minReviewerVersion && semver.lt(defaults.version, minReviewerVersion)) {
				logger.debug({ version: defaults.version }, "Adding reviewer not yet supported.");
				return;
			}
			try {
				const teamReviewers = new Set(reviewers.filter((r) => r.startsWith("team:")).map((r) => r.substring(5)));
				const userReviewers = new Set(reviewers.filter((r) => !r.startsWith("team:")));
				await requestPrReviewers(http, config.repository, number, {
					reviewers: [...userReviewers],
					...teamReviewers.size && { team_reviewers: [...teamReviewers] }
				});
			} catch (err) {
				logger.warn({
					err,
					number,
					reviewers
				}, "Failed to assign reviewer");
			}
		},
		massageMarkdown(prBody) {
			return smartTruncate(smartLinks(prBody), maxBodyLength());
		},
		maxBodyLength
	};
	function maxBodyLength() {
		return 1e6;
	}
	return {
		platform,
		resetPlatform
	};
}
/**
* Forgejo reports the Gitea version it is compatible with as part of its own
* version, for example `11.0.1-99-c504062+gitea-1.22.0`.
*/
function isForgejo(version) {
	return version.includes("gitea-");
}
function logDetectedVersion(version) {
	if (isForgejo(version)) logger.info(`Detected Forgejo instance, please use 'forgejo' platform instead`);
	logger.debug(`${isForgejo(version) ? "Forgejo" : "Gitea"} version: ${version}`);
}
function checkNativeAutomerge(version) {
	const minVersion = isForgejo(version) ? "10.0.0" : "1.24.0";
	if (semver.gte(version, minVersion)) return null;
	return `Gitea-native automerge: not supported on this version of ${isForgejo(version) ? "Forgejo" : "Gitea"}. Use ${minVersion} or newer.`;
}
const { platform, resetPlatform } = createPlatform({
	id,
	defaultEndpoint: "https://gitea.com/",
	http: giteaHttp,
	setBaseUrl,
	logDetectedVersion,
	checkNativeAutomerge,
	minReviewerVersion: "1.14.0"
});
const { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getRawFile, getJsonFile, getIssueList, getPr, massageMarkdown, maxBodyLength, getPrList, getRepos, initPlatform, initRepo, mergePr, setBranchStatus, updatePr } = platform;
//#endregion
export { addAssignees, addReviewers, createPlatform, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, giteaHttp, gitea_exports, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, resetPlatform, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map