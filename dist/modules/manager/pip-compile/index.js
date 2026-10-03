import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/pip-compile/index.ts
var pip_compile_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["requirements.txt"];
const displayName = "pip-compile";
const url = "https://pip-tools.readthedocs.io/en/latest/reference/pip-compile/";
const categories = ["python"];
const defaultConfig = {
	managerFilePatterns: [],
	lockFileMaintenance: {
		enabled: true,
		branchTopic: "pip-compile-refresh",
		commitMessageAction: "Refresh pip-compile outputs"
	}
};
const supportedDatasources = [PypiDatasource.id, GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractAllPackageFiles, extractPackageFile, knownDepTypes, lockFileNames, pip_compile_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map