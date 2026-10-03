import { toBase64 } from "../../../util/string.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { isProbablyJwt } from "../../../util/http/jwt.js";
import { getPrBodyStruct } from "../pr-body.js";
import { GitPullRequestMergeStrategy, PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces.js";
//#region lib/modules/platform/azure/util.ts
function getGitStatusContextCombinedName(context) {
	if (!context) return;
	const combinedName = `${context.genre ? `${context.genre}/` : ""}${context.name}`;
	logger.trace(`Got combined context name of ${combinedName}`);
	return combinedName;
}
function getGitStatusContextFromCombinedName(context) {
	if (!context) return;
	let name = context;
	let genre;
	const lastSlash = context.lastIndexOf("/");
	if (lastSlash > 0) {
		name = context.substring(lastSlash + 1);
		genre = context.substring(0, lastSlash);
	}
	return {
		genre,
		name
	};
}
function getBranchNameWithoutRefsheadsPrefix(branchPath) {
	if (!branchPath) {
		logger.error(`getBranchNameWithoutRefsheadsPrefix(undefined)`);
		return;
	}
	if (!branchPath.startsWith("refs/heads/")) {
		logger.trace(`The refs/heads/ name should have started with 'refs/heads/' but it didn't. (${branchPath})`);
		return branchPath;
	}
	return branchPath.substring(11, branchPath.length);
}
const stateMap = {
	[PullRequestStatus.Abandoned]: "closed",
	[PullRequestStatus.Completed]: "merged"
};
function getRenovatePRFormat(azurePr) {
	const number = azurePr.pullRequestId;
	const sourceBranch = getBranchNameWithoutRefsheadsPrefix(azurePr.sourceRefName);
	const targetBranch = getBranchNameWithoutRefsheadsPrefix(azurePr.targetRefName);
	const bodyStruct = getPrBodyStruct(azurePr.description);
	const createdAt = azurePr.creationDate?.toISOString();
	const state = stateMap[azurePr.status] ?? "open";
	const sourceRefName = azurePr.sourceRefName;
	return {
		...azurePr,
		sourceBranch,
		state,
		number,
		bodyStruct,
		sourceRefName,
		targetBranch,
		createdAt
	};
}
function getStorageExtraCloneOpts(config) {
	let authType;
	let authValue;
	if (!config.token && config.username && config.password) {
		authType = "basic";
		authValue = toBase64(`${config.username}:${config.password}`);
	} else if (config.token && isProbablyJwt(config.token)) {
		authType = "bearer";
		authValue = config.token;
	} else {
		authType = "basic";
		authValue = toBase64(`:${config.token}`);
	}
	addSecretForSanitizing(authValue, "global");
	return { "-c": `http.extraHeader=AUTHORIZATION: ${authType} ${authValue}` };
}
function max4000Chars(str) {
	if (str && str.length >= 4e3) return str.substring(0, 3999);
	return str;
}
function getProjectAndRepo(str) {
	logger.trace(`getProjectAndRepo(${str})`);
	const strSplit = str.split(`/`);
	if (strSplit.length === 1) return {
		project: str,
		repo: str
	};
	if (strSplit.length === 2) return {
		project: strSplit[0],
		repo: strSplit[1]
	};
	const msg = `Azure repository can be only structured this way : 'repository' or 'projectName/repository'!`;
	logger.warn({ repository: str }, msg);
	throw new Error(msg);
}
function getRepoByName(name, repos) {
	logger.trace(`getRepoByName(${name})`);
	let { project, repo } = getProjectAndRepo(name);
	project = project.toLowerCase();
	repo = repo.toLowerCase();
	const foundRepo = repos?.find((r) => project === r?.project?.name?.toLowerCase() && repo === r?.name?.toLowerCase());
	if (!foundRepo) logger.debug(`Repo not found: ${name}`);
	return foundRepo ?? null;
}
function mapMergeStrategy(mergeStrategy) {
	switch (mergeStrategy) {
		case "rebase":
		case "fast-forward": return GitPullRequestMergeStrategy.Rebase;
		case "merge-commit": return GitPullRequestMergeStrategy.NoFastForward;
		case "rebase-merge": return GitPullRequestMergeStrategy.RebaseMerge;
		case "squash": return GitPullRequestMergeStrategy.Squash;
		default: return GitPullRequestMergeStrategy.NoFastForward;
	}
}
function getWorkItemTitle(rawTitle, repository) {
	const repoName = repository.split("/").pop();
	if (rawTitle.includes("Dependency Dashboard") && !rawTitle.includes(`[${repoName}]`)) return `[${repoName}] ${rawTitle}`;
	return rawTitle;
}
//#endregion
export { getBranchNameWithoutRefsheadsPrefix, getGitStatusContextCombinedName, getGitStatusContextFromCombinedName, getProjectAndRepo, getRenovatePRFormat, getRepoByName, getStorageExtraCloneOpts, getWorkItemTitle, mapMergeStrategy, max4000Chars };

//# sourceMappingURL=util.js.map