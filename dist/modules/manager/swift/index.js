import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/swift/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
//#region lib/modules/manager/swift/index.ts
var swift_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const displayName = "Swift Package Manager";
const url = "https://www.swift.org/package-manager";
const categories = ["swift"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)Package\\.swift/"],
	versioning: id,
	pinDigests: false
};
const supportedDatasources = [
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id
];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, getRangeStrategy, supportedDatasources, swift_exports, updateArtifacts, url };

//# sourceMappingURL=index.js.map