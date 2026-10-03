import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/util/assign-keys.ts
/**
* Assigns non-nullish values from `right` to `left` for the given `keys`.
*/
function assignKeys(left, right, keys) {
	for (const key of keys) {
		const val = right[key];
		if (!isNullOrUndefined(val)) left[key] = val;
	}
	return left;
}
//#endregion
export { assignKeys };

//# sourceMappingURL=assign-keys.js.map