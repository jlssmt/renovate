import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GlasskubePackagesDatasource } from "../../datasource/glasskube-packages/index.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
//#region lib/modules/manager/glasskube/index.ts
var glasskube_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://glasskube.dev/docs";
const categories = ["kubernetes", "cd"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [GlasskubePackagesDatasource.id];
//#endregion
export { categories, defaultConfig, extractAllPackageFiles, extractPackageFile, glasskube_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map