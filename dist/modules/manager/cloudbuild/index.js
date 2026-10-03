import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/cloudbuild/index.ts
var cloudbuild_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Cloud Build";
const url = "https://cloud.google.com/build/docs";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)cloudbuild\\.ya?ml/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, cloudbuild_exports, defaultConfig, displayName, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map