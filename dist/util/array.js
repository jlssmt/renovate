import { isArray, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/util/array.ts
function coerceArray(input) {
	if (isArray(input)) return input;
	return [];
}
function isNotNullOrUndefined(value) {
	return !isNullOrUndefined(value);
}
/**
* Converts a single value or an array of values to an array of values.
* @param value a single value or an array of values
* @returns array of values
*/
function toArray(value) {
	return isArray(value) ? value : [value];
}
function deduplicateArray(array) {
	return Array.from(new Set(array));
}
//#endregion
export { coerceArray, deduplicateArray, isNotNullOrUndefined, toArray };

//# sourceMappingURL=array.js.map