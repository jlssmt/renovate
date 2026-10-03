import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/conan/index.js";
import { ConanDatasource } from "../../datasource/conan/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
//#region lib/modules/manager/conan/index.ts
var conan_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["conan.lock"];
const url = "https://docs.conan.io";
const categories = ["c"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)conanfile\\.(txt|py)$/"],
	datasource: ConanDatasource.id,
	versioning: id
};
const supportedDatasources = [ConanDatasource.id];
//#endregion
export { categories, conan_exports, defaultConfig, extractPackageFile, getRangeStrategy, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map