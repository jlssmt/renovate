import { getNewValue, getPinnedValue, isLessThanRange } from "./range.js";
import * as pep440 from "@renovatebot/pep440";
//#region lib/modules/versioning/pep440/index.ts
const id = "pep440";
const { compare: sortVersions, satisfies: satisfies$1, valid, validRange, explain, gt: isGreaterThan, major: getMajor, minor: getMinor, patch: getPatch, eq } = pep440;
function isVersion(input) {
	return !!valid(input);
}
function isStable(input) {
	const version = explain(input);
	if (!version) return false;
	return !version.is_prerelease;
}
function isValid(input) {
	return validRange(input) || isVersion(input);
}
function getSatisfyingVersion(versions, range) {
	const found = pep440.filter(versions, range).sort(sortVersions);
	return found.length === 0 ? null : found.at(-1);
}
function minSatisfyingVersion(versions, range) {
	const found = pep440.filter(versions, range).sort(sortVersions);
	return found.length === 0 ? null : found[0];
}
function isSingleVersion(constraint) {
	return isVersion(constraint) || constraint?.startsWith("==") && isVersion(constraint.substring(2).trim());
}
function equals(version1, version2) {
	return isVersion(version1) && isVersion(version2) && eq(version1, version2);
}
function matches(version, range) {
	if (!isVersion(version)) return false;
	if (isVersion(range)) return equals(version, range);
	return isValid(range) && satisfies$1(version, range, { prereleases: true });
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	isCompatible: isVersion,
	isGreaterThan,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue,
	getPinnedValue,
	sortVersions,
	isLessThanRange
};
//#endregion
export { api, api as default, id, isSingleVersion, isValid, isVersion, matches };

//# sourceMappingURL=index.js.map