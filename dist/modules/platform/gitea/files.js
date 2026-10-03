import { getQueryString } from "../../../util/url.js";
import { ContentsListResponse, RepoContents } from "./schema.js";
//#region lib/modules/platform/gitea/files.ts
/**
* The Gitea "repository contents" API, shared by Gitea and Forgejo.
*
* URLs are relative to the API root, which comes from `options.baseUrl`, or
* from the `Http` instance's own base URL.
*
* https://docs.gitea.com/api/1.20/#tag/repository/operation/repoGetContents
*/
/**
* Escape each path segment on its own, so that the slashes separating them
* stay slashes in the URL.
*/
function encodePath(path) {
	return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
function contentsUrl(repoPath, path) {
	return `repos/${repoPath}/contents${path ? `/${encodePath(path)}` : ""}`;
}
/**
* Read a single file from a repository, optionally at a given ref.
*/
async function getRepoFile(http, repoPath, filePath, ref, options = {}) {
	const query = getQueryString(ref ? { ref } : {});
	const url = `${contentsUrl(repoPath, filePath)}?${query}`;
	return (await http.getJson(url, options, RepoContents)).body;
}
/**
* List the entries of a repository directory, defaulting to the repository root.
*/
async function listRepoDir(http, repoPath, dirPath, options = {}) {
	const url = contentsUrl(repoPath, dirPath);
	return (await http.getJson(url, options, ContentsListResponse)).body;
}
//#endregion
export { getRepoFile, listRepoDir };

//# sourceMappingURL=files.js.map