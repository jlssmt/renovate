import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
import { updateDependency } from "./update.js";
//#region lib/modules/manager/ant/index.ts
var ant_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateDependency: () => updateDependency,
	url: () => url
});
const displayName = "Apache Ant";
const url = "https://ant.apache.org";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: ["**/build.xml"] };
const supportedDatasources = [MavenDatasource.id];
//#endregion
export { ant_exports, categories, defaultConfig, displayName, extractAllPackageFiles, extractPackageFile, supportedDatasources, updateDependency, url };

//# sourceMappingURL=index.js.map