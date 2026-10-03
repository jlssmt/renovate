import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import "../../versioning/git/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import updateArtifacts from "./artifacts.js";
import extractPackageFile from "./extract.js";
import updateDependency from "./update.js";
//#region lib/modules/manager/git-submodules/index.ts
var git_submodules_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://git-scm.com/docs/git-submodule";
const defaultConfig = {
	enabled: false,
	versioning: "git",
	managerFilePatterns: ["/(^|/)\\.gitmodules$/"]
};
const supportedDatasources = [GitRefsDatasource.id];
//#endregion
export { defaultConfig, extractPackageFile, git_submodules_exports, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map