import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
//#region lib/modules/manager/pipenv/index.ts
var pipenv_exports = /* @__PURE__ */ __exportAll({
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
const lockFileNames = ["Pipfile.lock"];
const url = "https://pipenv.pypa.io/en/latest";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)Pipfile$/"] };
const supportedDatasources = [PypiDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, pipenv_exports, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, url };

//# sourceMappingURL=index.js.map