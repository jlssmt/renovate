import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/kotlin-script/index.ts
var kotlin_script_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://kotlinlang.org/docs/custom-script-deps-tutorial.html";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: ["/^.+\\.main\\.kts$/"] };
const supportedDatasources = [MavenDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, kotlin_script_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map