import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BitriseDatasource } from "../../datasource/bitrise/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/bitrise/index.ts
var bitrise_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url,
	urls: () => urls
});
const url = "https://devcenter.bitrise.io";
const categories = ["ci"];
const urls = ["https://devcenter.bitrise.io/en/steps-and-workflows/introduction-to-steps.html"];
const defaultConfig = { managerFilePatterns: ["/(^|/)bitrise\\.ya?ml$/"] };
const supportedDatasources = [BitriseDatasource.id, GitTagsDatasource.id];
//#endregion
export { bitrise_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, url, urls };

//# sourceMappingURL=index.js.map