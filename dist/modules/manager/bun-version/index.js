import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { isValid } from "../../versioning/npm/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
//#region lib/modules/manager/bun-version/index.ts
var bun_version_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const categories = ["js"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)\\.bun-version$/"],
	versioning: "npm"
};
const supportedDatasources = [NpmDatasource.id];
function extractPackageFile(content) {
	if (!content) return null;
	if (content.split("\n").length > 2) return null;
	const dep = {
		depName: "Bun",
		packageName: "bun",
		currentValue: content.trim(),
		datasource: NpmDatasource.id
	};
	if (!isValid(content.trim())) dep.skipReason = "invalid-version";
	return { deps: [dep] };
}
//#endregion
export { bun_version_exports, categories, defaultConfig, extractPackageFile, supportedDatasources };

//# sourceMappingURL=index.js.map