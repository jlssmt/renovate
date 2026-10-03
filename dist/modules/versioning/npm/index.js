import { normalizeLegacyXRanges } from "../semver/common.js";
import { isBreaking } from "../semver/index.js";
import { getNewValue } from "./range.js";
import semver from "semver";
import stable from "semver-stable";
const { compare: sortVersions, maxSatisfying, minSatisfying, major: getMajor, minor: getMinor, patch: getPatch, satisfies: satisfies$1, valid: valid$1, validRange, ltr, gt: isGreaterThan, eq: equals, subset: semverSubset, intersects: semverIntersects } = semver;
function normalizeNpmRange(range) {
	return normalizeLegacyXRanges(range);
}
function isValid(input) {
	return !!validRange(normalizeNpmRange(input));
}
function isVersion(input) {
	return !!valid$1(input);
}
function matches(version, range) {
	return satisfies$1(version, normalizeNpmRange(range));
}
function getSatisfyingVersion(versions, range) {
	return maxSatisfying(versions, normalizeNpmRange(range));
}
function minSatisfyingVersion(versions, range) {
	return minSatisfying(versions, normalizeNpmRange(range));
}
function isLessThanRange(version, range) {
	return ltr(version, normalizeNpmRange(range));
}
function subset(subRange, superRange) {
	return semverSubset(normalizeNpmRange(subRange), normalizeNpmRange(superRange));
}
function intersects(range1, range2) {
	return semverIntersects(normalizeNpmRange(range1), normalizeNpmRange(range2));
}
function isSingleVersion(constraint) {
	return isVersion(constraint) || constraint?.startsWith("=") && isVersion(constraint.substring(1).trim());
}
const api = {
	equals,
	getMajor,
	getMinor,
	getNewValue,
	getPatch,
	isBreaking,
	isCompatible: isVersion,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable: stable.is,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	sortVersions,
	subset,
	intersects
};
//#endregion
export { api, api as default, isValid, isVersion };

//# sourceMappingURL=index.js.map