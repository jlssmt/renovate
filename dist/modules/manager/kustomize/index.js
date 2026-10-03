import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/kustomize/index.ts
var kustomize_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://kubectl.docs.kubernetes.io/references/kustomize";
const categories = ["kubernetes"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)kustomization\\.ya?ml$/"],
	pinDigests: false
};
const supportedDatasources = [
	DockerDatasource.id,
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	HelmDatasource.id
];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, kustomize_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map