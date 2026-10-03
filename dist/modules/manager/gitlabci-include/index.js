import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/gitlabci-include/index.ts
var gitlabci_include_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "GitLab CI/CD include";
const url = "https://docs.gitlab.com/ee/ci/yaml/includes.html";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/\\.gitlab-ci\\.ya?ml$/"] };
const supportedDatasources = [GitlabTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, gitlabci_include_exports, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map