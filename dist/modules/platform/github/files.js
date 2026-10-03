import { fromBase64 } from "../../../util/string.js";
//#region lib/modules/platform/github/files.ts
/**
* Read a single file from a repository, optionally at a given ref.
*
* The URL is relative to the API root, which comes from `options.baseUrl`, or
* from the `Http` instance's own base URL when the caller reads the host it is
* configured for.
*
* https://docs.github.com/en/rest/repos/contents
*/
async function getRepoFile(http, repo, fileName, ref, options = {}) {
	let url = `repos/${repo}/contents/${fileName}`;
	if (ref) url += `?ref=${ref}`;
	const res = await http.getJsonUnchecked(url, options);
	return fromBase64(res.body.content);
}
//#endregion
export { getRepoFile };

//# sourceMappingURL=files.js.map