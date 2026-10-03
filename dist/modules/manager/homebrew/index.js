import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { extractPackageFile } from "./extract.js";
import { updateDependency } from "./update.js";
//#region lib/modules/manager/homebrew/index.ts
var homebrew_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://brew.sh";
const defaultConfig = {
	commitMessageTopic: "Homebrew Formula {{depName}}",
	managerFilePatterns: ["/^Formula/\\w*/?[^/]+[.]rb$/"]
};
const supportedDatasources = [
	GithubTagsDatasource.id,
	GithubReleasesDatasource.id,
	NpmDatasource.id
];
//#endregion
export { defaultConfig, extractPackageFile, homebrew_exports, supportedDatasources, updateDependency, url };

//# sourceMappingURL=index.js.map