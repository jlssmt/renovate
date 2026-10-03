import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import "../../versioning/hex/index.js";
import { HexDatasource } from "../../datasource/hex/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
//#region lib/modules/manager/gleam/index.ts
var gleam_exports = /* @__PURE__ */ __exportAll({
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
const categories = ["elixir"];
const url = "https://gleam.run/documentation";
const defaultConfig = {
	managerFilePatterns: ["/(^|/)gleam.toml$/"],
	versioning: "hex"
};
const lockFileNames = ["manifest.toml"];
const supportedDatasources = [HexDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, getRangeStrategy, gleam_exports, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map