import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/semver/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/batect-wrapper/index.ts
var batect_wrapper_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts
});
const categories = ["batect"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)batect$/"],
	versioning: id
};
const supportedDatasources = [GithubReleasesDatasource.id];
//#endregion
export { batect_wrapper_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, updateArtifacts };

//# sourceMappingURL=index.js.map