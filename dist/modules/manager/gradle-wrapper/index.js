import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/gradle/index.js";
import { GradleVersionDatasource } from "../../datasource/gradle-version/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/gradle-wrapper/index.ts
var gradle_wrapper_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://docs.gradle.org/current/userguide/gradle_wrapper.html";
const categories = ["java"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)gradle/wrapper/gradle-wrapper\\.properties$/"],
	versioning: id
};
const supportedDatasources = [GradleVersionDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, gradle_wrapper_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map