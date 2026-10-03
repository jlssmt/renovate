import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { JenkinsPluginsDatasource } from "../../datasource/jenkins-plugins/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/jenkins/index.ts
var jenkins_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://www.jenkins.io/doc";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)plugins\\.(txt|ya?ml)$/"] };
const supportedDatasources = [JenkinsPluginsDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, jenkins_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map