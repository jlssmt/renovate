import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/argocd/index.ts
var argocd_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Argo CD";
const url = "https://argo-cd.readthedocs.io";
const categories = ["kubernetes", "cd"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [
	DockerDatasource.id,
	GitTagsDatasource.id,
	HelmDatasource.id
];
//#endregion
export { argocd_exports, categories, defaultConfig, displayName, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map