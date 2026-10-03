import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/pep723/index.ts
var pep723_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "PEP 723";
const url = "https://peps.python.org/pep-0723";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [PypiDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, pep723_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map