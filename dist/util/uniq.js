//#region lib/util/uniq.ts
function uniq(array, eql = (x, y) => x === y) {
	return array.filter((x, idx, arr) => arr.findIndex((y) => eql(x, y)) === idx);
}
//#endregion
export { uniq };

//# sourceMappingURL=uniq.js.map