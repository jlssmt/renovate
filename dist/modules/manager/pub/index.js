import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DartDatasource } from "../../datasource/dart/index.js";
import { DartVersionDatasource } from "../../datasource/dart-version/index.js";
import { FlutterVersionDatasource } from "../../datasource/flutter-version/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/pub/index.ts
var pub_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => "pub",
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["pubspec.lock"];
const url = "https://dart.dev/tools/pub/packages";
const categories = ["dart"];
const defaultConfig = { managerFilePatterns: ["/(^|/)pubspec\\.ya?ml$/"] };
const supportedDatasources = [
	DartDatasource.id,
	DartVersionDatasource.id,
	FlutterVersionDatasource.id
];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, pub_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map