import { api as api$1 } from "../npm/index.js";
//#region lib/modules/versioning/deno/index.ts
const id = "deno";
function isValid(input) {
	if (input === "latest") return true;
	return api$1.isValid(input);
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion, isReplacement }) {
	if (currentValue === "latest") {
		if (rangeStrategy === "replace" || rangeStrategy === "pin") return newVersion;
		if (rangeStrategy === "update-lockfile") return currentValue;
		return null;
	}
	if (currentValue === "*") {
		if (rangeStrategy === "pin") return newVersion;
		if (rangeStrategy === "update-lockfile") return currentValue;
		return null;
	}
	return api$1.getNewValue({
		currentValue,
		rangeStrategy,
		currentVersion,
		newVersion,
		isReplacement
	});
}
const api = {
	...api$1,
	isValid,
	getNewValue
};
//#endregion
export { api, api as default, getNewValue, id, isValid };

//# sourceMappingURL=index.js.map