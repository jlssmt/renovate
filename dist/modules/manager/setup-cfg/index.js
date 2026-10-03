import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/pep440/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/setup-cfg/index.ts
var setup_cfg_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Setuptools (setup.cfg)";
const url = "https://setuptools.pypa.io/en/latest/userguide/declarative_config.html";
const categories = ["python"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)setup\\.cfg$/"],
	versioning: id
};
const supportedDatasources = [PypiDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, setup_cfg_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map