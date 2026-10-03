import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./artifacts.js";
import { bumpPackageVersion } from "./update.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
//#region lib/modules/manager/pep621/index.ts
var pep621_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => lockFileMaintenanceIsDelegatedToPackageManager,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["pdm.lock", "uv.lock"];
const lockFileMaintenanceIsDelegatedToPackageManager = "Delegated to the underlying package manager CLI - `pdm` or `uv` - depending on which lockfile format the project uses.";
const displayName = "PEP 621";
const url = "https://peps.python.org/pep-0621";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)pyproject\\.toml$/"] };
const supportedDatasources = [PypiDatasource.id];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, lockFileMaintenanceIsDelegatedToPackageManager, lockFileNames, pep621_exports, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, url };

//# sourceMappingURL=index.js.map