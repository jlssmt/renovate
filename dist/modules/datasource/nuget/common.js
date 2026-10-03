import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { api } from "../../versioning/nuget/index.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/nuget/common.ts
const buildMetaRe = regEx(/\+.+$/g);
function removeBuildMeta(version) {
	return version.replace(buildMetaRe, "");
}
const urlWhitespaceRe = regEx(/\s/g);
function massageUrl(url) {
	if (isNullOrUndefined(url)) return null;
	let resultUrl = url;
	resultUrl = resultUrl.replace(urlWhitespaceRe, "%20");
	return resultUrl;
}
const protocolVersionRegExp = regEx(/#protocolVersion=(?<protocol>2|3)/);
function parseRegistryUrl(registryUrl) {
	const parsedUrl = parseUrl(registryUrl);
	if (!parsedUrl) {
		logger.debug({ urL: registryUrl }, `nuget registry failure: can't parse ${registryUrl}`);
		return {
			feedUrl: registryUrl,
			protocolVersion: null
		};
	}
	let protocolVersion = 2;
	const protocolVersionMatch = protocolVersionRegExp.exec(parsedUrl.hash)?.groups;
	if (protocolVersionMatch) {
		const { protocol } = protocolVersionMatch;
		parsedUrl.hash = "";
		protocolVersion = Number.parseInt(protocol, 10);
	} else if (parsedUrl.pathname.endsWith(".json")) protocolVersion = 3;
	return {
		feedUrl: parsedUrl.href,
		protocolVersion
	};
}
/**
* Compare two versions. Return:
* - `1` if `a > b` or `b` is invalid
* - `-1` if `a < b` or `a` is invalid
* - `0` if `a == b` or both `a` and `b` are invalid
*/
function sortNugetVersions(a, b) {
	if (api.isValid(a)) {
		if (api.isValid(b)) return api.sortVersions(a, b);
		return 1;
	}
	if (api.isValid(b)) return -1;
	return 0;
}
//#endregion
export { massageUrl, parseRegistryUrl, removeBuildMeta, sortNugetVersions };

//# sourceMappingURL=common.js.map