import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { KubernetesApiDatasource } from "../../datasource/kubernetes-api/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/kubernetes/index.ts
var kubernetes_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://kubernetes.io/docs";
const categories = ["kubernetes"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [DockerDatasource.id, KubernetesApiDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, kubernetes_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map