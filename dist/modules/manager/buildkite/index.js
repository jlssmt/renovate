import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/buildkite/index.ts
var buildkite_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://buildkite.com/docs";
const categories = ["ci"];
const defaultConfig = {
	managerFilePatterns: ["/buildkite\\.ya?ml/", "/\\.buildkite/.+\\.ya?ml$/"],
	commitMessageTopic: "buildkite plugin {{depName}}",
	commitMessageExtra: "to {{#if isMajor}}{{{prettyNewMajor}}}{{else}}{{{newValue}}}{{/if}}"
};
const supportedDatasources = [GithubTagsDatasource.id, BitbucketTagsDatasource.id];
//#endregion
export { buildkite_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map