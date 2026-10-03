import { ensureTrailingSlash } from "../url.js";
//#region lib/util/github/url.ts
const defaultSourceUrlBase = "https://github.com/";
const defaultApiBaseUrl = "https://api.github.com/";
function getSourceUrlBase(registryUrl) {
	return ensureTrailingSlash(registryUrl ?? defaultSourceUrlBase);
}
function getApiBaseUrl(registryUrl) {
	const sourceUrlBase = getSourceUrlBase(registryUrl);
	if (sourceUrlBase === defaultSourceUrlBase || sourceUrlBase === defaultApiBaseUrl) return defaultApiBaseUrl;
	if (sourceUrlBase.endsWith("/api/v3/")) return sourceUrlBase;
	return `${sourceUrlBase}api/v3/`;
}
function getSourceUrl(packageName, registryUrl) {
	return `${getSourceUrlBase(registryUrl)}${packageName}`;
}
//#endregion
export { getApiBaseUrl, getSourceUrl, getSourceUrlBase };

//# sourceMappingURL=url.js.map