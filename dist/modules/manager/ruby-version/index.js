import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/ruby/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/ruby-version/index.ts
var ruby_version_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const displayName = ".ruby-version";
const categories = ["ruby"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.ruby-version$/"],
	versioning: id
};
const supportedDatasources = [RubyVersionDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, ruby_version_exports, supportedDatasources };

//# sourceMappingURL=index.js.map