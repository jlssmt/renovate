import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { CpanDatasource } from "../../datasource/cpan/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/cpanfile/index.ts
var cpanfile_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "cpanfile";
const url = "https://metacpan.org/dist/Module-CPANfile/view/lib/cpanfile.pod";
const categories = ["perl"];
const defaultConfig = { managerFilePatterns: ["/(^|/)cpanfile$/"] };
const supportedDatasources = [CpanDatasource.id, GithubTagsDatasource.id];
//#endregion
export { categories, cpanfile_exports, defaultConfig, displayName, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map