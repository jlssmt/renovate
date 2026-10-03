import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/semver/index.js";
import { CdnjsDatasource } from "../../datasource/cdnjs/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/html/index.ts
var html_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const displayName = "HTML";
const categories = ["cd"];
const defaultConfig = {
	managerFilePatterns: ["/\\.html?$/"],
	versioning: id,
	digest: { enabled: false },
	pinDigests: false
};
const supportedDatasources = [CdnjsDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, html_exports, supportedDatasources };

//# sourceMappingURL=index.js.map