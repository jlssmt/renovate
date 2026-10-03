import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/velaci/index.ts
var velaci_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Vela";
const url = "https://go-vela.github.io/docs";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)\\.vela\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, supportedDatasources, url, velaci_exports };

//# sourceMappingURL=index.js.map