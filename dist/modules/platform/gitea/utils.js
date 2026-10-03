import { CONFIG_GIT_URL_UNAVAILABLE } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { getPrBodyStruct } from "../pr-body.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/modules/platform/gitea/utils.ts
function smartLinks(body) {
	return body?.replace(regEx(/\]\(\.\.\/issues\//g), "](issues/").replace(regEx(/\]\(\.\.\/pull\//g), "](pulls/");
}
function trimTrailingApiPath(url) {
	return url?.replace(regEx(/api\/v1\/?$/g), "");
}
function getRepoUrl(repo, gitUrl, endpoint, hostType) {
	if (gitUrl === "ssh") {
		if (!repo.ssh_url) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
		logger.debug(`Using SSH URL: ${repo.ssh_url}`);
		return repo.ssh_url;
	}
	const opts = find({
		hostType,
		url: endpoint
	});
	if (gitUrl === "endpoint") {
		const url = parseUrl(endpoint);
		if (!url) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
		url.username = opts.token ?? "";
		url.pathname = `${url.pathname}${repo.full_name}.git`;
		logger.debug({ url: url.toString() }, "using URL based on configured endpoint");
		return url.toString();
	}
	if (!repo.clone_url) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
	logger.debug(`Using HTTP URL: ${repo.clone_url}`);
	const repoUrl = parseUrl(repo.clone_url);
	if (!repoUrl) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
	repoUrl.username = opts.token ?? "";
	return repoUrl.toString();
}
function getMergeMethod(strategy, allowedMergeMethods) {
	switch (strategy) {
		case "fast-forward": return allowedMergeMethods?.has("fast-forward-only") ? "fast-forward-only" : "rebase";
		case "merge-commit": return "merge";
		case "rebase": return "rebase-merge";
		case "squash": return strategy;
		default: return null;
	}
}
const API_PATH = "/api/v1";
/** Human readable name of each platform, used in log messages. */
const platformDisplayName = {
	gitea: "Gitea",
	forgejo: "Forgejo"
};
const DRAFT_PREFIX = "WIP: ";
const reconfigurePrRegex = regEx(/reconfigure$/);
function toRenovatePR(data, author) {
	if (!data.base?.ref || !data.head?.label || !data.head?.sha || !data.head?.repo?.full_name) {
		logger.trace(`Skipping Pull Request #${data.number} due to missing base and/or head branch`);
		return null;
	}
	const createdBy = data.user?.login;
	if (createdBy && author && !reconfigurePrRegex.test(data.head.label) && createdBy !== author) return null;
	let title = data.title;
	let isDraft = false;
	if (title.startsWith("WIP: ")) {
		title = title.substring(5);
		isDraft = true;
	}
	return {
		labels: coerceArray(data.labels).map((l) => l.name),
		number: data.number,
		state: data.merged ? "merged" : data.state,
		title,
		isDraft,
		bodyStruct: getPrBodyStruct(data.body),
		sha: data.head.sha,
		sourceBranch: data.head.label,
		targetBranch: data.base.ref,
		sourceRepo: data.head.repo.full_name,
		createdAt: data.created_at,
		cannotMergeReason: data.mergeable ? void 0 : `pr.mergeable="${data.mergeable}"`,
		hasAssignees: !!(data.assignee?.login ?? isNonEmptyArray(data.assignees))
	};
}
/**
* Check if a repository is usable.
* A repo isn't usable if one of the following conditions is met:
* - The repo is a `mirror`
* - We don't have pull or push permissions
* - Pull requests are disabled
* @param repo Repo to check
* @returns  `true` if the repository is usable, `false` otherwise
*/
function usableRepo(repo) {
	if (repo.mirror === true) return false;
	if (repo.permissions.pull === false || repo.permissions.push === false) {
		logger.debug(`Skipping repository ${repo.full_name} because of missing pull or push permissions`);
		return false;
	}
	if (repo.has_pull_requests === false) {
		logger.debug(`Skipping repository ${repo.full_name} because pull requests are disabled`);
		return false;
	}
	return true;
}
function isAllowed(style, repo) {
	switch (style) {
		case "merge": return repo.allow_merge_commits;
		case "rebase": return repo.allow_rebase;
		case "rebase-merge": return repo.allow_rebase_explicit;
		case "squash": return repo.allow_squash_merge;
		case "fast-forward-only": return repo.allow_fast_forward_only_merge;
	}
}
//#endregion
export { API_PATH, DRAFT_PREFIX, getMergeMethod, getRepoUrl, isAllowed, platformDisplayName, smartLinks, toRenovatePR, trimTrailingApiPath, usableRepo };

//# sourceMappingURL=utils.js.map