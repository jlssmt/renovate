import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./artifacts.js";
//#region lib/modules/manager/pip_requirements/index.ts
var pip_requirements_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const displayName = "pip Requirements";
const url = "https://pip.pypa.io/en/stable/reference/requirements-file-format";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)[\\w-]*requirements([-._]\\w+)?\\.(txt|pip)$/"] };
const supportedDatasources = [PypiDatasource.id, GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, pip_requirements_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map