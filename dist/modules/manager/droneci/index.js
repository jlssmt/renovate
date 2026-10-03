import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/droneci/index.ts
var droneci_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.drone.io";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)\\.drone\\.yml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, droneci_exports, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map