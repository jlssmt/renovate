import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/docker/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/pyenv/index.ts
var pyenv_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "pyenv";
const url = "https://github.com/pyenv/pyenv#readme";
const categories = ["python"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.python-version$/"],
	versioning: id,
	pinDigests: false
};
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, pyenv_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map