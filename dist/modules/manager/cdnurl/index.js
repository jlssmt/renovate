import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/semver/index.js";
import { CdnjsDatasource } from "../../datasource/cdnjs/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/cdnurl/index.ts
var cdnurl_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const displayName = "CDN URL";
const categories = ["cd"];
const defaultConfig = {
	managerFilePatterns: [],
	versioning: id
};
const supportedDatasources = [CdnjsDatasource.id];
//#endregion
export { categories, cdnurl_exports, defaultConfig, displayName, extractPackageFile, supportedDatasources };

//# sourceMappingURL=index.js.map