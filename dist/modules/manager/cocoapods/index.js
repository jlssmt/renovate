import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/ruby/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { PodDatasource } from "../../datasource/pod/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/cocoapods/index.ts
var cocoapods_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const displayName = "CocoaPods";
const url = "https://cocoapods.org";
const categories = ["swift"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)Podfile$/"],
	versioning: id
};
const supportedDatasources = [
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	PodDatasource.id
];
//#endregion
export { categories, cocoapods_exports, defaultConfig, displayName, extractPackageFile, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map