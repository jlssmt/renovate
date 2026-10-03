import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BazelDatasource } from "../../datasource/bazel/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/bazel-module/index.ts
var bazel_module_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://bazel.build/external/module";
const categories = ["bazel"];
const defaultConfig = { managerFilePatterns: ["/(^|/|\\.)MODULE\\.bazel$/"] };
const supportedDatasources = [
	BazelDatasource.id,
	CrateDatasource.id,
	DockerDatasource.id,
	GithubTagsDatasource.id,
	MavenDatasource.id
];
const lockFileNames = ["MODULE.bazel.lock"];
//#endregion
export { bazel_module_exports, categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map