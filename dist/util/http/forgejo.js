import { regEx } from "../regex.js";
import { GiteaHttp } from "./gitea.js";
//#region lib/util/http/forgejo.ts
let baseUrl;
function setBaseUrl(newBaseUrl) {
	baseUrl = newBaseUrl.replace(regEx(/\/*$/), "/");
}
/**
* Forgejo speaks the Gitea API, so the client only differs in its default
* `hostType` and in the base url, which is kept separate from Gitea's.
*/
var ForgejoHttp = class extends GiteaHttp {
	get baseUrl() {
		return baseUrl;
	}
	constructor(hostType, options) {
		super(hostType ?? "forgejo", options);
	}
};
//#endregion
export { ForgejoHttp, setBaseUrl };

//# sourceMappingURL=forgejo.js.map