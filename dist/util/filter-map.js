import { isTruthy } from "@sindresorhus/is";
//#region lib/util/filter-map.ts
/**
* Filter and map an array *in place* with single iteration.
*/
function filterMap(array, fn) {
	const length = array.length;
	let newIdx = 0;
	for (let oldIdx = 0; oldIdx < length; oldIdx += 1) {
		const item = array[oldIdx];
		const res = fn(item);
		if (isTruthy(res)) {
			array[newIdx] = res;
			newIdx += 1;
		}
	}
	const deletedCount = length - newIdx;
	if (deletedCount) array.length = length - deletedCount;
	return array;
}
//#endregion
export { filterMap };

//# sourceMappingURL=filter-map.js.map