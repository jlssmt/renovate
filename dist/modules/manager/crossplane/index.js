import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/crossplane/index.ts
var crossplane_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.crossplane.io";
const defaultConfig = { managerFilePatterns: [] };
const categories = ["kubernetes", "iac"];
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, crossplane_exports, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map