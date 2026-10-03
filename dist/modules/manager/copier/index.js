import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/pep440/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { updateDependency } from "./update.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/copier/index.ts
var copier_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const categories = ["python"];
const url = "https://copier.readthedocs.io";
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.copier-answers(\\..+)?\\.ya?ml/"],
	versioning: id
};
const supportedDatasources = [GitTagsDatasource.id];
//#endregion
export { categories, copier_exports, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map