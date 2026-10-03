import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/helmsman/index.ts
var helmsman_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://github.com/Praqma/helmsman#readme";
const categories = [
	"cd",
	"helm",
	"kubernetes"
];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [HelmDatasource.id, DockerDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, helmsman_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map