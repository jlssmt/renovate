import { fromBase64 } from "../../../util/string.js";
//#region lib/modules/platform/gitlab/files.ts
/**
* Read a single file from a project at a given ref, defaulting to `HEAD`.
*
* The URL is relative to the API root, which comes from `options.baseUrl`, or
* from the `Http` instance's own base URL when the caller reads the host it is
* configured for.
*
* `project` is the URL-encoded project path or the numeric project ID, as
* GitLab expects it in the URL.
*
* https://docs.gitlab.com/api/repository_files/#get-file-from-repository
*/
async function getRepoFile(http, project, fileName, ref, options = {}) {
	const url = `projects/${project}/repository/files/${encodeURIComponent(fileName)}?ref=${ref ?? "HEAD"}`;
	const res = await http.getJsonUnchecked(url, options);
	return fromBase64(res.body.content);
}
//#endregion
export { getRepoFile };

//# sourceMappingURL=files.js.map