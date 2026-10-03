import { logger } from "../../../logger/index.js";
import { parseRange } from "semver-utils";
//#region lib/modules/manager/mix/range.ts
function getRangeStrategy(config) {
	const { currentValue, rangeStrategy } = config;
	const isComplexRange = currentValue ? parseRange(currentValue).length > 1 : false;
	if (rangeStrategy === "bump" && isComplexRange) {
		logger.debug({ currentValue }, "Replacing bump strategy for complex range with widen");
		return "widen";
	}
	if (rangeStrategy !== "auto") return rangeStrategy;
	if (isComplexRange) return "widen";
	return "update-lockfile";
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map