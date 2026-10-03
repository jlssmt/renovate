//#region lib/util/mask.ts
function maskToken(str) {
	return str ? [
		str.substring(0, 2),
		"*".repeat(str.length - 4),
		str.slice(-2)
	].join("") : "";
}
//#endregion
export { maskToken };

//# sourceMappingURL=mask.js.map