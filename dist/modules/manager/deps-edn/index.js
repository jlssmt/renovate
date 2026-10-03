import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/maven/index.js";
import { ClojureDatasource } from "../../datasource/clojure/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/deps-edn/index.ts
var deps_edn_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "deps.edn";
const url = "https://clojure.org/reference/deps_edn";
const categories = ["java"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)(?:deps|bb)\\.edn$/"],
	versioning: id
};
const supportedDatasources = [ClojureDatasource.id];
//#endregion
export { categories, defaultConfig, deps_edn_exports, displayName, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map