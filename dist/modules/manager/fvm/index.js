import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/semver/index.js";
import { FlutterVersionDatasource } from "../../datasource/flutter-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/fvm/index.ts
var fvm_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => "FVM",
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const categories = ["dart"];
const url = "https://fvm.app";
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.fvm/fvm_config\\.json$/", "/(^|/)\\.fvmrc$/"],
	versioning: id
};
const supportedDatasources = [FlutterVersionDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, fvm_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map