import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GiteaTagsDatasource } from "../../datasource/gitea-tags/index.js";
import { GithubDigestDatasource } from "../../datasource/github-digest/index.js";
import { GithubRunnersDatasource } from "../../datasource/github-runners/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/github-actions/index.ts
var github_actions_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "GitHub Actions";
const url = "https://docs.github.com/en/actions";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)(workflow-templates|\\.(?:github|gitea|forgejo)/(?:workflows|actions))/.+\\.ya?ml$/", "/(^|/)action\\.ya?ml$/"] };
const supportedDatasources = [
	GiteaTagsDatasource.id,
	GithubDigestDatasource.id,
	GithubRunnersDatasource.id,
	GithubTagsDatasource.id,
	RustVersionDatasource.id
];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, github_actions_exports, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map