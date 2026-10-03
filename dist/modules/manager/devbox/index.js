import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DevboxDatasource } from "../../datasource/devbox/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/devbox/index.ts
var devbox_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts
});
const lockFileNames = ["devbox.lock"];
const defaultConfig = { managerFilePatterns: ["/(^|/)devbox\\.json$/"] };
const supportedDatasources = [DevboxDatasource.id];
//#endregion
export { defaultConfig, devbox_exports, extractPackageFile, lockFileNames, supportedDatasources, updateArtifacts };

//# sourceMappingURL=index.js.map