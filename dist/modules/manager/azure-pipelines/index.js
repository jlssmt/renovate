import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { AzurePipelinesTasksDatasource } from "../../datasource/azure-pipelines-tasks/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/azure-pipelines/index.ts
var azure_pipelines_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://learn.microsoft.com/azure/devops/pipelines";
const categories = ["ci"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/).azuredevops/.+\\.ya?ml$/", "/azure.*pipelines?.*\\.ya?ml$/"],
	enabled: false
};
const supportedDatasources = [AzurePipelinesTasksDatasource.id, GitTagsDatasource.id];
//#endregion
export { azure_pipelines_exports, categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map