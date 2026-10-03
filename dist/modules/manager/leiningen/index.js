import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/maven/index.js";
import { ClojureDatasource } from "../../datasource/clojure/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/leiningen/index.ts
var leiningen_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://leiningen.org";
const categories = ["java"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)project\\.clj$/"],
	versioning: id
};
const supportedDatasources = [ClojureDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, leiningen_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map