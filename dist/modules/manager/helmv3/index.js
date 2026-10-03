import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { bumpPackageVersion } from "./update.js";
//#region lib/modules/manager/helmv3/index.ts
var helmv3_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["Chart.lock"];
const displayName = "Helm v3";
const url = "https://helm.sh/docs";
const categories = ["helm", "kubernetes"];
const defaultConfig = {
	registryAliases: { stable: "https://charts.helm.sh/stable" },
	commitMessageTopic: "helm chart {{depName}}",
	managerFilePatterns: ["/(^|/)Chart\\.ya?ml$/"]
};
const supportedDatasources = [DockerDatasource.id, HelmDatasource.id];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, displayName, extractPackageFile, helmv3_exports, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map