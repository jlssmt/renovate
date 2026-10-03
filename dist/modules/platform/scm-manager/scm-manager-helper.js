import { ScmManagerHttp } from "../../../util/http/scm-manager.js";
import { DefaultBranch, PagedPullRequest, PagedRepo, PullRequest, Repo, User } from "./schema.js";
//#region lib/modules/platform/scm-manager/scm-manager-helper.ts
const scmManagerHttp = new ScmManagerHttp();
const URLS = {
	ME: "me",
	ALL_REPOS: "repositories?pageSize=1000000",
	REPO: (repoPath) => `repositories/${repoPath}`,
	PULLREQUESTS: (repoPath) => `pull-requests/${repoPath}`,
	ALL_PULLREQUESTS_WITH_PAGINATION: (repoPath) => `pull-requests/${repoPath}?status=ALL&pageSize=1000000`,
	MY_PULLREQUESTS_WITH_PAGINATION: (repoPath) => `pull-requests/${repoPath}?status=MINE&pageSize=1000000`,
	PULLREQUEST_BY_ID: (repoPath, id) => `pull-requests/${repoPath}/${id}`
};
const CONTENT_TYPES = {
	ME: "application/vnd.scmm-me+json;v=2",
	REPOSITORY: "application/vnd.scmm-repository+json;v=2",
	REPOSITORIES: "application/vnd.scmm-repositoryCollection+json;v=2",
	GIT_CONFIG: "application/vnd.scmm-gitDefaultBranch+json;v=2",
	PULLREQUEST: "application/vnd.scmm-pullRequest+json;v=2",
	PULLREQUESTS: "application/vnd.scmm-pullRequestCollection+json;v=2"
};
async function getCurrentUser(token) {
	return (await scmManagerHttp.getJson(URLS.ME, {
		headers: { accept: CONTENT_TYPES.ME },
		token
	}, User)).body;
}
async function getRepo(repoPath) {
	return (await scmManagerHttp.getJson(URLS.REPO(repoPath), { headers: { accept: CONTENT_TYPES.REPOSITORY } }, Repo)).body;
}
async function getAllRepos() {
	return (await scmManagerHttp.getJson(URLS.ALL_REPOS, { headers: { accept: CONTENT_TYPES.REPOSITORIES } }, PagedRepo)).body._embedded.repositories;
}
async function getDefaultBranch(repo) {
	const defaultBranchUrl = repo._links.defaultBranch;
	return (await scmManagerHttp.getJson(defaultBranchUrl.href, { headers: { accept: CONTENT_TYPES.GIT_CONFIG } }, DefaultBranch)).body.defaultBranch;
}
async function getAllRepoPrs(repoPath, ignorePrAuthor) {
	return (await scmManagerHttp.getJson(ignorePrAuthor ? URLS.ALL_PULLREQUESTS_WITH_PAGINATION(repoPath) : URLS.MY_PULLREQUESTS_WITH_PAGINATION(repoPath), { headers: { accept: CONTENT_TYPES.PULLREQUESTS } }, PagedPullRequest)).body._embedded.pullRequests;
}
async function getRepoPr(repoPath, id) {
	return (await scmManagerHttp.getJson(URLS.PULLREQUEST_BY_ID(repoPath, id), { headers: { accept: CONTENT_TYPES.PULLREQUEST } }, PullRequest)).body;
}
async function createScmPr(repoPath, params) {
	const createPrResponse = await scmManagerHttp.postJson(URLS.PULLREQUESTS(repoPath), {
		body: params,
		headers: {
			"Content-Type": CONTENT_TYPES.PULLREQUEST,
			accept: CONTENT_TYPES.PULLREQUEST
		}
	});
	return (await scmManagerHttp.getJson(createPrResponse.headers.location, { headers: { accept: CONTENT_TYPES.PULLREQUEST } }, PullRequest)).body;
}
async function updateScmPr(repoPath, id, params) {
	const currentPr = await getRepoPr(repoPath, id);
	await scmManagerHttp.putJson(URLS.PULLREQUEST_BY_ID(repoPath, id), {
		body: mergePullRequestWithUpdate(currentPr, params),
		headers: { "Content-Type": CONTENT_TYPES.PULLREQUEST }
	});
}
function mergePullRequestWithUpdate(pr, updateParams) {
	return {
		...pr,
		title: updateParams.title,
		description: updateParams.description ?? pr.description,
		status: updateParams.status ?? pr.status,
		target: updateParams.target ?? pr.target
	};
}
//#endregion
export { createScmPr, getAllRepoPrs, getAllRepos, getCurrentUser, getDefaultBranch, getRepo, getRepoPr, scmManagerHttp, updateScmPr };

//# sourceMappingURL=scm-manager-helper.js.map