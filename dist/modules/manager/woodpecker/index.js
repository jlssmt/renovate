import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/woodpecker/index.ts
var woodpecker_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://woodpecker-ci.org";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/^\\.woodpecker(?:/[^/]+)?\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, supportedDatasources, url, woodpecker_exports };

//# sourceMappingURL=index.js.map