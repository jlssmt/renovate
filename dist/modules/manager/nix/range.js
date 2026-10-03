//#region lib/modules/manager/nix/range.ts
function getRangeStrategy({ currentValue }) {
	if (currentValue) return "replace";
	return "update-lockfile";
}
//#endregion
export { getRangeStrategy };

//# sourceMappingURL=range.js.map