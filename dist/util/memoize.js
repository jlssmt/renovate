//#region lib/util/memoize.ts
function memoize(callback) {
	let memo = null;
	return () => {
		if (memo) return memo.res;
		const res = callback();
		memo = { res };
		return res;
	};
}
//#endregion
export { memoize };

//# sourceMappingURL=memoize.js.map