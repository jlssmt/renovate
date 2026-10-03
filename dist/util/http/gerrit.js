import { regEx } from "../regex.js";
import { isHttpUrl } from "../url.js";
import { parseJson } from "../common.js";
import { HttpBase } from "./http.js";
//#region lib/util/http/gerrit.ts
let baseUrl;
function setBaseUrl(url) {
	baseUrl = url;
}
/**
* Access Gerrit REST-API and strip-of the "magic prefix" from responses.
* @see https://gerrit-review.googlesource.com/Documentation/rest-api.html
*/
var GerritHttp = class GerritHttp extends HttpBase {
	static magicPrefix = regEx(/^\)]}'\n/g);
	get baseUrl() {
		return baseUrl;
	}
	constructor(options) {
		super("gerrit", options);
	}
	resolveUrl(requestUrl, options) {
		return super.resolveUrl(isHttpUrl(requestUrl) ? requestUrl : `${baseUrl}${requestUrl}`, options);
	}
	processOptions(url, options) {
		options.parseJson = (text) => parseJson(text.replace(GerritHttp.magicPrefix, ""), url.pathname);
	}
};
//#endregion
export { GerritHttp, setBaseUrl };

//# sourceMappingURL=gerrit.js.map