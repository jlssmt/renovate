import { minimatch } from "../../../../util/minimatch.js";
import { logger } from "../../../../logger/index.js";
//#region lib/modules/manager/npm/extract/utils.ts
function matchesAnyPattern(val, patterns) {
	const res = patterns.some((pattern) => pattern === `${val}/` || minimatch(pattern, { dot: true }).match(val));
	logger.trace({
		val,
		patterns,
		res
	}, `matchesAnyPattern`);
	return res;
}
//#endregion
export { matchesAnyPattern };

//# sourceMappingURL=utils.js.map