import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/gradle/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
import { extractAllPackageFiles } from "./extract.js";
import { updateDependency } from "./update.js";
//#region lib/modules/manager/gradle/index.ts
var gradle_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const lockFileNames = ["gradle.lockfile"];
const url = "https://docs.gradle.org/current/userguide/getting_started_dep_man.html";
const categories = ["java"];
const defaultConfig = {
	managerFilePatterns: [
		"/\\.gradle(\\.kts)?$/",
		"/(^|/)gradle\\.properties$/",
		"/(^|/)gradle/.+\\.toml$/",
		"/(^|/)buildSrc/.+\\.kt$/",
		"/\\.versions\\.toml$/",
		`/(^|/)versions.props$/`,
		`/(^|/)versions.lock$/`
	],
	timeout: 600,
	versioning: id
};
const supportedDatasources = [MavenDatasource.id];
//#endregion
export { categories, defaultConfig, extractAllPackageFiles, gradle_exports, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map