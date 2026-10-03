import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
import { bumpPackageVersion } from "./update.js";
import { updateLockedDependency } from "./update-locked.js";
//#region lib/modules/manager/cargo/index.ts
var cargo_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const lockFileNames = ["Cargo.lock"];
const url = "https://doc.rust-lang.org/cargo";
const categories = ["rust"];
const defaultConfig = {
	commitMessageTopic: "Rust crate {{depName}}",
	managerFilePatterns: ["/(^|/)Cargo\\.toml$/"]
};
const supportedDatasources = [
	CrateDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	GitRefsDatasource.id,
	GitTagsDatasource.id
];
//#endregion
export { bumpPackageVersion, cargo_exports, categories, defaultConfig, extractPackageFile, getRangeStrategy, lockFileNames, supportedDatasources, updateArtifacts, updateLockedDependency, url };

//# sourceMappingURL=index.js.map