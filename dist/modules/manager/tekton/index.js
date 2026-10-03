import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/tekton/index.ts
var tekton_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://tekton.dev/docs";
const categories = ["ci", "cd"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [DockerDatasource.id, GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, tekton_exports, url };

//# sourceMappingURL=index.js.map