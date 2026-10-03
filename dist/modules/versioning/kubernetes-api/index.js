import { RegExpVersioningApi } from "../regex/index.js";
//#region lib/modules/versioning/kubernetes-api/index.ts
const id = "kubernetes-api";
var KubernetesApiVersioningApi = class KubernetesApiVersioningApi extends RegExpVersioningApi {
	static versionRegex = "^(?:(?<compatibility>\\S+)/)?v(?<major>\\d+)(?<prerelease>(?:alpha|beta)\\d+)?$";
	constructor() {
		super(KubernetesApiVersioningApi.versionRegex);
	}
};
const api = new KubernetesApiVersioningApi();
//#endregion
export { KubernetesApiVersioningApi, api, api as default, id };

//# sourceMappingURL=index.js.map