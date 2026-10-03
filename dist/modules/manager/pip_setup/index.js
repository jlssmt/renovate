import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/pip_setup/index.ts
var pip_setup_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "pip setup.py";
const url = "https://pip.pypa.io/en/latest/reference/build-system/setup-py";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)setup\\.py$/"] };
const supportedDatasources = [PypiDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, pip_setup_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map