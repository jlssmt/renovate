import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
//#region lib/modules/manager/nix/index.ts
var nix_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["flake.lock"];
const url = "https://nix.dev";
const defaultConfig = {
	managerFilePatterns: ["/(^|/)flake\\.nix$/"],
	commitMessageTopic: "nix",
	commitMessageExtra: "to {{newValue}}",
	enabled: false
};
const supportedDatasources = [GitRefsDatasource.id];
//#endregion
export { defaultConfig, extractPackageFile, getRangeStrategy, lockFileNames, nix_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map