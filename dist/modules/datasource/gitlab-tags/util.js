import { regEx } from "../../../util/regex.js";
import { joinUrlParts } from "../../../util/url.js";
//#region lib/modules/datasource/gitlab-tags/util.ts
const defaultRegistryUrl = "https://gitlab.com";
function getDepHost(registryUrl = defaultRegistryUrl) {
	return registryUrl.replace(regEx(/\/api\/v4$/), "");
}
function getSourceUrl(packageName, registryUrl) {
	const depHost = getDepHost(registryUrl);
	return joinUrlParts(depHost, packageName);
}
//#endregion
export { defaultRegistryUrl, getDepHost, getSourceUrl };

//# sourceMappingURL=util.js.map