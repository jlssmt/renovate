import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
//#region lib/modules/manager/batect/index.ts
var batect_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://batect.dev/docs";
const categories = ["batect"];
const defaultConfig = { managerFilePatterns: ["/(^|/)batect(-bundle)?\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id, GitTagsDatasource.id];
//#endregion
export { batect_exports, categories, defaultConfig, extractAllPackageFiles, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map