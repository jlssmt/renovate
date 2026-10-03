import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/meteor/index.ts
var meteor_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.meteor.com";
const categories = ["js"];
const defaultConfig = { managerFilePatterns: ["/(^|/)package\\.js$/"] };
const supportedDatasources = [NpmDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, meteor_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map