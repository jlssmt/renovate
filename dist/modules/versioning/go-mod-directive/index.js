import { regEx } from "../../../util/regex.js";
import { api as api$1 } from "../npm/index.js";
//#region lib/modules/versioning/go-mod-directive/index.ts
const id = "go-mod-directive";
const validRegex = regEx(/^\d+\.\d+(?:\.\d+)?$/);
function toNpmRange(range) {
	return `^${range}`;
}
function shorten(version) {
	return version.split(".").slice(0, 2).join(".");
}
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	if (rangeStrategy === "bump") {
		if (api$1.matches(newVersion, ">=1.20.0")) return newVersion;
		return shorten(newVersion);
	}
	if (rangeStrategy === "replace" && !matches(newVersion, currentValue)) return newVersion;
	return currentValue;
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions, toNpmRange(range));
}
function isLessThanRange(version, range) {
	return api$1.isLessThanRange(version, toNpmRange(range));
}
function isValid(input) {
	return !!input.match(validRegex);
}
function matches(version, range) {
	return api$1.matches(version, toNpmRange(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions, toNpmRange(range));
}
const api = {
	...api$1,
	getNewValue,
	getSatisfyingVersion,
	isLessThanRange,
	isValid,
	matches,
	minSatisfyingVersion
};
//#endregion
export { api, api as default, id, isValid };

//# sourceMappingURL=index.js.map