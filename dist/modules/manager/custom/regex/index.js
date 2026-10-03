import { __exportAll } from "../../../../_virtual/_rolldown/runtime.js";
import { logger } from "../../../../logger/index.js";
import { validMatchFields } from "../utils.js";
import { handleAny, handleCombination, handleRecursive } from "./strategies.js";
import { isTruthy } from "@sindresorhus/is";
import upath from "upath";
//#region lib/modules/manager/custom/regex/index.ts
var regex_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const categories = ["custom"];
const defaultConfig = { pinDigests: false };
const supportedDatasources = ["*"];
const displayName = "Regex";
function extractPackageFile(content, packageFile, config) {
	let deps;
	const packageFileName = upath.basename(packageFile);
	const packageFileInfo = {
		packageFileDir: upath.dirname(packageFile),
		packageFileName,
		content,
		packageFile
	};
	switch (config.matchStringsStrategy) {
		default:
		case "any":
			deps = handleAny(config, packageFileInfo);
			break;
		case "combination":
			deps = handleCombination(config, packageFileInfo);
			break;
		case "recursive": deps = handleRecursive(config, packageFileInfo);
	}
	deps = deps.filter(isTruthy);
	if (deps.length) {
		const res = {
			deps,
			matchStrings: config.matchStrings
		};
		if (config.matchStringsStrategy) res.matchStringsStrategy = config.matchStringsStrategy;
		for (const field of validMatchFields.map((f) => `${f}Template`)) if (config[field]) res[field] = config[field];
		if (config.autoReplaceStringTemplate) res.autoReplaceStringTemplate = config.autoReplaceStringTemplate;
		return res;
	}
	logger.debug({ packageFile }, "No dependencies found in file for custom regex manager");
	return null;
}
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, regex_exports, supportedDatasources };

//# sourceMappingURL=index.js.map