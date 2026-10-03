import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/smithy/index.ts
var smithy_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Smithy";
const url = "https://smithy.io/2.0/guides/smithy-build-json.html";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: ["/(^|/)smithy-build\\.json$/"] };
const supportedDatasources = [MavenDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, smithy_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map