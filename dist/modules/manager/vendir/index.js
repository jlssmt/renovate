import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/vendir/index.ts
var vendir_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const categories = ["helm", "kubernetes"];
const lockFileNames = ["vendir.lock.yml"];
const displayName = "vendir";
const url = "https://carvel.dev/vendir/docs/latest";
const defaultConfig = {
	commitMessageTopic: "vendir {{depName}}",
	managerFilePatterns: ["/(^|/)vendir\\.yml$/"]
};
const supportedDatasources = [HelmDatasource.id, DockerDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, url, vendir_exports };

//# sourceMappingURL=index.js.map