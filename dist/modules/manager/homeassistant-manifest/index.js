import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/homeassistant-manifest/index.ts
var homeassistant_manifest_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Home Assistant Manifest";
const url = "https://developers.home-assistant.io/docs/creating_integration_manifest/#requirements";
const defaultConfig = { managerFilePatterns: ["/(^|/)manifest\\.json$/"] };
const categories = ["python"];
const supportedDatasources = [PypiDatasource.id, GitTagsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, homeassistant_manifest_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map