import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GalaxyCollectionDatasource } from "../../datasource/galaxy-collection/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/ansible-galaxy/index.ts
var ansible_galaxy_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.ansible.com/ansible/latest/galaxy/user_guide.html";
const categories = ["ansible", "iac"];
const defaultConfig = { managerFilePatterns: ["/(^|/)(galaxy|requirements)(\\.ansible)?\\.ya?ml$/"] };
const supportedDatasources = [
	GalaxyCollectionDatasource.id,
	GitTagsDatasource.id,
	GithubTagsDatasource.id
];
//#endregion
export { ansible_galaxy_exports, categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map