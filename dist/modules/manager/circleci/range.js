//#region lib/modules/manager/circleci/range.ts
function getRangeStrategy({ rangeStrategy }) {
	return rangeStrategy === "auto" ? "pin" : rangeStrategy;
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map