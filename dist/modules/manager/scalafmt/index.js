import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/scalafmt/index.ts
var scalafmt_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://scalameta.org/scalafmt/docs/configuration.html#version";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: ["/(^|/)\\.scalafmt.conf$/"] };
const supportedDatasources = [GithubReleasesDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, scalafmt_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map