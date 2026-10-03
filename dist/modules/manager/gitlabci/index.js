import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/gitlabci/index.ts
var gitlabci_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "GitLab CI/CD";
const url = "https://docs.gitlab.com/ee/ci";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/\\.gitlab-ci\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id, GitlabTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractAllPackageFiles, extractPackageFile, gitlabci_exports, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map