//#region lib/modules/manager/cargo/range.ts
function getRangeStrategy({ currentValue, rangeStrategy }) {
	if (rangeStrategy !== "auto") return rangeStrategy;
	if (currentValue?.includes("<")) return "widen";
	return "update-lockfile";
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map