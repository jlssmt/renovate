import { regEx } from "../../../util/regex.js";
import { ensureTrailingSlash } from "../../../util/url.js";
//#region lib/modules/datasource/gitea-tags/util.ts
/**
* URL and cache-key helpers shared by the datasources which speak the Gitea
* API (`gitea-tags`, `gitea-releases`, `forgejo-tags`, `forgejo-releases`).
*
* All of them take an already resolved registry URL, so each datasource
* applies its own default registry URL before calling them.
*/
function getApiUrl(registryUrl) {
	const res = registryUrl.replace(regEx(/\/api\/v1$/), "");
	return `${ensureTrailingSlash(res)}api/v1/`;
}
function getSourceUrl(packageName, registryUrl) {
	return `${ensureTrailingSlash(registryUrl)}${packageName}`;
}
function getCacheKey(registryUrl, repo, type) {
	return `${registryUrl}:${repo}:${type}`;
}
//#endregion
export { getApiUrl, getCacheKey, getSourceUrl };

//# sourceMappingURL=util.js.map