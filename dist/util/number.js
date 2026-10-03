import { regEx } from "./regex.js";
import { isString } from "@sindresorhus/is";
//#region lib/util/number.ts
/**
* Coerces a value to a number with optional default value.
* @param val the value to coerce
* @param def default value
* @returns cocerced value
*/
function coerceNumber(val, def) {
	return val ?? def ?? 0;
}
/**
* Parses a value as a finite positive integer with optional default value.
* If no default value is provided, the default value is 0.
* @param val Value to parse as finite integer.
* @param def Optional default value.
* @returns The parsed value or the default value if the parsed value is not finite.
*/
function parseInteger(val, def) {
	const parsed = isString(val) && regEx(/^\d+$/).test(val) ? Number.parseInt(val, 10) : NaN;
	return Number.isFinite(parsed) ? parsed : def ?? 0;
}
//#endregion
export { coerceNumber, parseInteger };

//# sourceMappingURL=number.js.map