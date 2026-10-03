import { logger } from "../../../logger/index.js";
//#region lib/modules/manager/composer/range.ts
function getRangeStrategy(config) {
	const { managerData = {}, currentValue, rangeStrategy } = config;
	const { composerJsonType } = managerData;
	const isComplexRange = currentValue?.includes(" || ") ?? false;
	if (rangeStrategy === "bump" && isComplexRange) {
		logger.debug({ currentValue }, "Replacing bump strategy for complex range with widen");
		return "widen";
	}
	if (rangeStrategy !== "auto") return rangeStrategy;
	if (isComplexRange || composerJsonType && ["typo3-cms-extension"].includes(composerJsonType)) return "widen";
	return "update-lockfile";
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map