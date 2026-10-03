import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/helm-values/index.ts
var helm_values_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://helm.sh/docs/chart_template_guide/values_files";
const categories = ["helm", "kubernetes"];
const defaultConfig = {
	commitMessageTopic: "helm values {{depName}}",
	managerFilePatterns: ["/(^|/)values\\.ya?ml$/"],
	pinDigests: false
};
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, helm_values_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map