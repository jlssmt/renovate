import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/xcodegen/index.ts
var xcodegen_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "XcodeGen";
const url = "https://github.com/yonaskolb/XcodeGen";
const categories = ["swift"];
const defaultConfig = {
	managerFilePatterns: ["**/project.yml"],
	pinDigests: false
};
const supportedDatasources = [
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id
];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, supportedDatasources, url, xcodegen_exports };

//# sourceMappingURL=index.js.map