import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import "../../versioning/pvp/index.js";
import { HackageDatasource } from "../../datasource/hackage/index.js";
import { extractNamesAndRanges, findDepends } from "./extract.js";
//#region lib/modules/manager/haskell-cabal/index.ts
var haskell_cabal_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	supportedDatasources: () => supportedDatasources
});
const defaultConfig = {
	managerFilePatterns: ["/\\.cabal$/"],
	pinDigests: false
};
const categories = ["haskell"];
const supportedDatasources = [HackageDatasource.id];
function extractPackageFile(content) {
	const deps = [];
	let current = content;
	for (;;) {
		const maybeContent = findDepends(current);
		if (maybeContent === null) break;
		const cabalDeps = extractNamesAndRanges(maybeContent.buildDependsContent);
		for (const cabalDep of cabalDeps) {
			const dep = {
				depName: cabalDep.packageName,
				currentValue: cabalDep.currentValue,
				datasource: HackageDatasource.id,
				packageName: cabalDep.packageName,
				versioning: "pvp",
				replaceString: cabalDep.replaceString.trim(),
				autoReplaceStringTemplate: "{{{depName}}} {{{newValue}}}"
			};
			deps.push(dep);
		}
		current = current.slice(maybeContent.lengthProcessed);
	}
	return { deps };
}
function getRangeStrategy({ rangeStrategy }) {
	if (rangeStrategy === "auto") return "widen";
	return rangeStrategy;
}
//#endregion
export { categories, defaultConfig, extractPackageFile, getRangeStrategy, haskell_cabal_exports, supportedDatasources };

//# sourceMappingURL=index.js.map