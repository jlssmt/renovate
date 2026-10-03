import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/maven-wrapper/index.ts
var maven_wrapper_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://maven.apache.org/tools/wrapper";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: ["/(^|\\/).mvn/wrapper/maven-wrapper.properties$/", "/(^|\\/)mvnw(.cmd)?$/"] };
const supportedDatasources = [MavenDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, maven_wrapper_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map