import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/jsonnet-bundler/index.ts
var jsonnet_bundler_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["jsonnetfile.lock.json"];
const displayName = "jsonnet-bundler";
const url = "https://github.com/jsonnet-bundler/jsonnet-bundler#readme";
const categories = ["kubernetes"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)jsonnetfile\\.json$/"],
	datasource: GitTagsDatasource.id
};
const supportedDatasources = [GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, jsonnet_bundler_exports, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map