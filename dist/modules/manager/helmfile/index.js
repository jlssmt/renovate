import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/helmfile/index.ts
var helmfile_exports = /* @__PURE__ */ __exportAll({
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
const lockFileNames = ["helmfile.lock"];
const url = "https://helmfile.readthedocs.io";
const categories = [
	"cd",
	"helm",
	"kubernetes"
];
const defaultConfig = {
	registryAliases: { stable: "https://charts.helm.sh/stable" },
	commitMessageTopic: "helm chart {{depName}}",
	managerFilePatterns: ["/(^|/)helmfile\\.ya?ml(?:\\.gotmpl)?$/", "/(^|/)helmfile\\.d/.+\\.ya?ml(?:\\.gotmpl)?$/"]
};
const supportedDatasources = [HelmDatasource.id, DockerDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, helmfile_exports, lockFileNames, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map