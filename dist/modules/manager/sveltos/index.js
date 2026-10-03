import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/sveltos/index.ts
var sveltos_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://projectsveltos.github.io/sveltos";
const categories = ["kubernetes", "cd"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [DockerDatasource.id, HelmDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, sveltos_exports, url };

//# sourceMappingURL=index.js.map