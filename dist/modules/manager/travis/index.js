import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/node/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/travis/index.ts
var travis_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Travis CI";
const url = "https://docs.travis-ci.com";
const categories = ["ci"];
const defaultConfig = {
	managerFilePatterns: ["/^\\.travis\\.ya?ml$/"],
	major: { enabled: false },
	versioning: id
};
const supportedDatasources = [NodeVersionDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, supportedDatasources, travis_exports, url };

//# sourceMappingURL=index.js.map