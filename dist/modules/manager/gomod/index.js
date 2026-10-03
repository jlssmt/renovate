import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { GolangVersionDatasource } from "../../datasource/golang-version/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { updateDependency } from "./update.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/gomod/index.ts
var gomod_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const displayName = "Go Modules";
const url = "https://go.dev/ref/mod";
const categories = ["golang"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)go\\.mod$/"],
	pinDigests: false
};
const supportedDatasources = [GoDatasource.id, GolangVersionDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, gomod_exports, knownDepTypes, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map