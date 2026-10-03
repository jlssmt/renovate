import { regEx } from "../../../util/regex.js";
import semver from "semver";
import stable from "semver-stable";
//#region lib/modules/versioning/semver/index.ts
const id = "semver";
const { is: isStable } = stable;
const { compare: sortVersions, maxSatisfying: getSatisfyingVersion, minSatisfying: minSatisfyingVersion, major: getMajor, minor: getMinor, patch: getPatch, satisfies: matches, valid: valid$1, ltr: isLessThanRange, gt: isGreaterThan, eq: equals } = semver;
function isVersion(input) {
	return !!valid$1(input);
}
function getNewValue({ currentValue, currentVersion, newVersion }) {
	if (currentVersion === `v${currentValue}`) return newVersion.replace(regEx(/^v/), "");
	return newVersion;
}
function isBreaking(current, version) {
	if (!isStable(version) || !isStable(current)) return true;
	const currentMajor = getMajor(current);
	if (currentMajor === 0) return true;
	return currentMajor !== getMajor(version);
}
function isCompatible(version) {
	return isVersion(version);
}
function isSingleVersion(version) {
	return isVersion(version);
}
function isValid(input) {
	return isVersion(input);
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	isBreaking,
	isCompatible,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue,
	sortVersions
};
//#endregion
export { api, api as default, getSatisfyingVersion, id, isBreaking, isVersion as isValid, isVersion };

//# sourceMappingURL=index.js.map