import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/node/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/nodenv/index.ts
var nodenv_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "nodenv";
const url = "https://github.com/nodenv/nodenv#readme";
const categories = ["js", "node"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.node-version$/"],
	versioning: id
};
const supportedDatasources = [NodeVersionDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, nodenv_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map