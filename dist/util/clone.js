import { quickStringify } from "./stringify.js";
import { logger } from "../logger/index.js";
import { klona } from "klona/json";
//#region lib/util/clone.ts
/**
* Creates a deep clone of an object.
* @param input The object to clone.
*/
function clone(input) {
	try {
		return klona(input);
	} catch (err) {
		logger.warn({ err }, "error cloning object");
		const str = quickStringify(input);
		// v8 ignore else -- not easily testable
		if (str) return JSON.parse(str);
		// istanbul ignore next: not easily testable
		throw err;
	}
}
//#endregion
export { clone };

//# sourceMappingURL=clone.js.map