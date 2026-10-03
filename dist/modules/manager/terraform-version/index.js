import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/hashicorp/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/terraform-version/index.ts
var terraform_version_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const displayName = ".terraform-version";
const categories = ["terraform"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.terraform-version$/"],
	versioning: id,
	extractVersion: "^v(?<version>.*)$"
};
const supportedDatasources = [GithubReleasesDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, supportedDatasources, terraform_version_exports };

//# sourceMappingURL=index.js.map