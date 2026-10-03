import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/helm-requirements/index.ts
var helm_requirements_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Helm v2 Chart Dependencies";
const url = "https://v2.helm.sh/docs/developing_charts/#chart-dependencies";
const categories = ["helm", "kubernetes"];
const defaultConfig = {
	registryAliases: { stable: "https://charts.helm.sh/stable" },
	commitMessageTopic: "helm chart {{depName}}",
	managerFilePatterns: ["/(^|/)requirements\\.ya?ml$/"]
};
const supportedDatasources = [HelmDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, helm_requirements_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map