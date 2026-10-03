import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/fleet/index.ts
var fleet_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Rancher Fleet";
const url = "https://fleet.rancher.io";
const categories = ["cd", "kubernetes"];
const defaultConfig = { managerFilePatterns: ["/(^|/)fleet\\.ya?ml/"] };
const supportedDatasources = [
	GitTagsDatasource.id,
	HelmDatasource.id,
	DockerDatasource.id
];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, fleet_exports, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map