import { logger } from "../../../logger/index.js";
import { parseRange } from "semver-utils";
//#region lib/modules/manager/npm/range.ts
function getRangeStrategy(config) {
	const { depType, currentValue, rangeStrategy } = config;
	const isComplexRange = parseRange(currentValue).length > 1;
	if (rangeStrategy === "bump" && isComplexRange) {
		logger.debug({ currentValue }, "Replacing bump strategy for complex range with widen");
		return "widen";
	}
	if (rangeStrategy && rangeStrategy !== "auto") return rangeStrategy;
	if (depType === "peerDependencies") {
		logger.debug("Widening peer dependencies");
		return "widen";
	}
	if (isComplexRange) return "widen";
	return "update-lockfile";
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map