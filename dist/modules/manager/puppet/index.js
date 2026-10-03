import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { PuppetForgeDatasource } from "../../datasource/puppet-forge/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/puppet/index.ts
var puppet_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://www.puppet.com/docs/index.html";
const categories = ["iac", "ruby"];
const defaultConfig = { managerFilePatterns: ["/(^|/)Puppetfile$/"] };
const supportedDatasources = [
	PuppetForgeDatasource.id,
	GithubTagsDatasource.id,
	GitTagsDatasource.id
];
//#endregion
export { categories, defaultConfig, extractPackageFile, puppet_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map