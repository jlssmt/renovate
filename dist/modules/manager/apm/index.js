import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/apm/index.ts
var apm_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	displayName: () => "APM",
	extractPackageFile: () => extractPackageFile,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://github.com/microsoft/apm";
const lockFileNames = ["apm.lock.yaml"];
const defaultConfig = { managerFilePatterns: ["/(^|/)apm\\.ya?ml$/"] };
const supportedDatasources = [
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	GitTagsDatasource.id
];
//#endregion
export { apm_exports, defaultConfig, extractPackageFile, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map