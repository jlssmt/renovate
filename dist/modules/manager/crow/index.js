import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/crow/index.ts
var crow_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://crowci.dev";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/^\\.crow(?:/[^/]+)?\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, crow_exports, defaultConfig, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map