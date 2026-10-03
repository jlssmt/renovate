import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { systemManifestFileNameRegex } from "./common.js";
import { updateArtifacts } from "./artifacts.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
//#region lib/modules/manager/flux/index.ts
var flux_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://fluxcd.io/flux";
const categories = ["cd", "kubernetes"];
const defaultConfig = { managerFilePatterns: [`/${systemManifestFileNameRegex}/`] };
const supportedDatasources = [
	GithubReleasesDatasource.id,
	GitRefsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	GitTagsDatasource.id,
	BitbucketTagsDatasource.id,
	HelmDatasource.id,
	DockerDatasource.id
];
//#endregion
export { categories, defaultConfig, extractAllPackageFiles, extractPackageFile, flux_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map