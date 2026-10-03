import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { getConfigFileNames } from "../../../config/app-strings.js";
import { allToolConfig } from "../../../util/exec/containerbase.js";
import { GiteaTagsDatasource } from "../../datasource/gitea-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/renovate-config/index.ts
var renovate_config_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const defaultConfig = { managerFilePatterns: getConfigFileNames().filter((name) => name !== "package.json") };
const supportedDatasources = Array.from(/* @__PURE__ */ new Set([
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	GiteaTagsDatasource.id,
	...Object.values(allToolConfig).map((conf) => conf.datasource)
]));
//#endregion
export { defaultConfig, extractPackageFile, renovate_config_exports, supportedDatasources };

//# sourceMappingURL=index.js.map