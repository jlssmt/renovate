import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/tflint-plugin/index.ts
var tflint_plugin_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "TFLint Plugins";
const url = "https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md";
const categories = ["terraform"];
const defaultConfig = {
	commitMessageTopic: "TFLint plugin {{depName}}",
	managerFilePatterns: ["/\\.tflint\\.hcl$/"],
	extractVersion: "^v(?<version>.*)$"
};
const supportedDatasources = [GithubReleasesDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, supportedDatasources, tflint_plugin_exports, url };

//# sourceMappingURL=index.js.map