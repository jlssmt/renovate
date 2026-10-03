import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { CondaDatasource } from "../../datasource/conda/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
//#region lib/modules/manager/pixi/index.ts
var pixi_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["pixi.lock"];
const url = "https://github.com/prefix-dev/pixi/";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)pyproject\\.toml$/", "/(^|/)pixi\\.toml$/"] };
const supportedDatasources = [PypiDatasource.id, CondaDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, pixi_exports, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, url };

//# sourceMappingURL=index.js.map