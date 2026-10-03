import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/bitbucket-pipelines/index.ts
var bitbucket_pipelines_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url,
	urls: () => urls
});
const url = "https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines";
const categories = ["ci"];
const urls = ["https://support.atlassian.com/bitbucket-cloud/docs/bitbucket-pipelines-configuration-reference"];
const defaultConfig = { managerFilePatterns: ["**/*-pipelines.yml"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { bitbucket_pipelines_exports, categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, url, urls };

//# sourceMappingURL=index.js.map