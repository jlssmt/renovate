import { regEx } from "../../../util/regex.js";
import { getNewValue, toSemverRange } from "./range.js";
import semver from "semver";
import stable from "semver-stable";
//#region lib/modules/versioning/swift/index.ts
const id = "swift";
const { is: isStable } = stable;
const { compare: sortVersions, maxSatisfying, minSatisfying, major: getMajor, minor: getMinor, patch: getPatch, satisfies: satisfies$1, valid: valid$1, validRange, ltr, gt: isGreaterThan, eq: equals } = semver;
function isValid(input) {
	return !!valid$1(input) || !!validRange(toSemverRange(input));
}
function isVersion(input) {
	return !!valid$1(input);
}
function getSatisfyingVersion(versions, range) {
	const normalizedVersions = versions.map((v) => v.replace(regEx(/^v/), ""));
	const semverRange = toSemverRange(range);
	return semverRange ? maxSatisfying(normalizedVersions, semverRange) : null;
}
function minSatisfyingVersion(versions, range) {
	const normalizedVersions = versions.map((v) => v.replace(regEx(/^v/), ""));
	const semverRange = toSemverRange(range);
	return semverRange ? minSatisfying(normalizedVersions, semverRange) : null;
}
function isLessThanRange(version, range) {
	const semverRange = toSemverRange(range);
	return semverRange ? ltr(version, semverRange) : false;
}
function matches(version, range) {
	if (isVersion(range) && equals(version, range)) return true;
	const semverRange = toSemverRange(range);
	return semverRange ? satisfies$1(version, semverRange) : false;
}
const api = {
	equals,
	getMajor,
	getMinor,
	getNewValue,
	getPatch,
	isCompatible: isVersion,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion: isVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	sortVersions
};
//#endregion
export { api, api as default, id, isValid, isVersion };

//# sourceMappingURL=index.js.map