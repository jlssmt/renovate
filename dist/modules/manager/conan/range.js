//#region lib/modules/manager/conan/range.ts
function getRangeStrategy({ rangeStrategy }) {
	return rangeStrategy === "auto" ? "bump" : rangeStrategy;
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map