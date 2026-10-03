import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/node/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/nvm/index.ts
var nvm_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => "nvm",
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://github.com/nvm-sh/nvm#readme";
const categories = ["js", "node"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.nvmrc$/"],
	versioning: id,
	pinDigests: false
};
const supportedDatasources = [NodeVersionDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, nvm_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map