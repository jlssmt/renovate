import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/mint/index.ts
var mint_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://github.com/yonaskolb/Mint#readme";
const categories = ["swift"];
const defaultConfig = { managerFilePatterns: ["/(^|/)Mintfile$/"] };
const supportedDatasources = [GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, mint_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map