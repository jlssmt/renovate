import { joinUrlParts } from "../../../util/url.js";
//#region lib/modules/platform/bitbucket/files.ts
/**
* Read a single file from a repository at a given ref, defaulting to `HEAD`.
*
* The URL is relative to the API root, which comes from `options.baseUrl`, or
* from the `Http` instance's own base URL when the caller reads the host it is
* configured for.
*
* https://developer.atlassian.com/cloud/bitbucket/rest/api-group-source/#api-repositories-workspace-repo-slug-src-commit-path-get
*/
async function getRepoFile(http, repo, filePath, ref, options = {}) {
	const url = joinUrlParts("2.0/repositories", repo, "src", ref ?? "HEAD", filePath);
	return (await http.getText(url, options)).body;
}
//#endregion
export { getRepoFile };

//# sourceMappingURL=files.js.map