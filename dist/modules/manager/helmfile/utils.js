import { getParentDir, localPathExists } from "../../../util/fs/index.js";
import upath from "upath";
//#region lib/modules/manager/helmfile/utils.ts
/** Returns true if a helmfile release contains kustomize specific keys **/
function kustomizationsKeysUsed(release) {
	return release.strategicMergePatches !== void 0 || release.jsonPatches !== void 0 || release.transformers !== void 0;
}
/** Returns true if a helmfile release uses a local chart with a kustomization.yaml file **/
function localChartHasKustomizationsYaml(release, helmFileYamlFileName) {
	const helmfileYamlParentDir = getParentDir(helmFileYamlFileName) || "";
	return localPathExists(upath.join(helmfileYamlParentDir, release.chart, "kustomization.yaml"));
}
function isOciRepositoryFlagSet(repository) {
	return repository.oci === true;
}
//#endregion
export { isOciRepositoryFlagSet, kustomizationsKeysUsed, localChartHasKustomizationsYaml };

//# sourceMappingURL=utils.js.map