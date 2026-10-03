import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/semver/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/bazelisk/index.ts
var bazelisk_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://github.com/bazelbuild/bazelisk";
const categories = ["bazel"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.bazelversion$/"],
	pinDigests: false,
	versioning: id
};
const supportedDatasources = [GithubReleasesDatasource.id];
const lockFileNames = ["MODULE.bazel.lock"];
//#endregion
export { bazelisk_exports, categories, defaultConfig, extractPackageFile, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map