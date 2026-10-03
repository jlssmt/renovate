import { regEx } from "../../../util/regex.js";
import semver from "semver";
import stable from "semver-stable";
const { is: isStable } = stable;
const { compare: sortVersions, major: getMajor, minor: getMinor, patch: getPatch, valid: valid$1, gt: isGreaterThan, gte: isGreaterThanOrEqual, eq: equals } = semver;
/**
* Elm range format: "1.0.0 <= v < 2.0.0"
* - Lower bound is inclusive (<=)
* - Upper bound is exclusive (<)
*/
const elmRangeRegex = regEx(/^(?<lower>\d+\.\d+\.\d+)\s*<=\s*v\s*<\s*(?<upper>\d+\.\d+\.\d+)$/);
/**
* Parse Elm range constraint into lower and upper bounds
* Returns null if the range is invalid or malformed (e.g., lower > upper)
*/
function parseElmRange(input) {
	const groups = elmRangeRegex.exec(input.trim())?.groups;
	if (!groups) return null;
	const { lower, upper } = groups;
	if (isGreaterThan(lower, upper)) return null;
	return {
		lower,
		upper
	};
}
/**
* Check if input is a valid semver version
*/
function isVersion(input) {
	if (!input) return false;
	return !!valid$1(input);
}
/**
* Check if input is a valid Elm version or range
*/
function isValid(input) {
	if (isVersion(input)) return true;
	const range = parseElmRange(input);
	if (!range) return false;
	return isVersion(range.lower) && isVersion(range.upper);
}
/**
* Check if version matches the range constraint
*/
function matches(version, range) {
	if (!isVersion(version)) return false;
	if (isVersion(range)) return equals(version, range);
	const parsed = parseElmRange(range);
	if (!parsed) return false;
	const { lower, upper } = parsed;
	return isGreaterThanOrEqual(version, lower) && isGreaterThan(upper, version);
}
/**
* Check if version is less than the range's lower bound
*/
function isLessThanRange(version, range) {
	if (!isVersion(version)) return false;
	if (isVersion(range)) return isGreaterThan(range, version);
	const parsed = parseElmRange(range);
	if (!parsed) return false;
	return isGreaterThan(parsed.lower, version);
}
/**
* Select the highest version from versions that matches the range
*/
function getSatisfyingVersion(versions, range) {
	return versions.filter((v) => isVersion(v) && matches(v, range)).sort((a, b) => sortVersions(b, a))[0] ?? null;
}
/**
* Select the lowest version from versions that matches the range
*/
function minSatisfyingVersion(versions, range) {
	return versions.filter((v) => isVersion(v) && matches(v, range)).sort((a, b) => sortVersions(a, b))[0] ?? null;
}
/**
* Check if input represents exactly one version (no range)
*/
function isSingleVersion(input) {
	return isVersion(input);
}
/**
* Check if version is stable (not prerelease)
*/
function isStableVersion(version) {
	if (!isVersion(version)) return false;
	return isStable(version);
}
/**
* Check if version is compatible
*/
function isCompatible(version) {
	return isVersion(version);
}
/**
* Calculate the next major version (e.g., "1.2.3" -> "2.0.0")
*/
function nextMajor(version) {
	return `${getMajor(version) + 1}.0.0`;
}
/**
* Calculate a new range/version based on the range strategy
*/
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	if (!isVersion(newVersion)) return null;
	if (isVersion(currentValue)) return newVersion;
	const parsed = parseElmRange(currentValue);
	if (!parsed) return null;
	const { lower, upper } = parsed;
	switch (rangeStrategy) {
		case "pin": return newVersion;
		case "bump":
			if (matches(newVersion, currentValue)) return `${newVersion} <= v < ${upper}`;
			return `${newVersion} <= v < ${nextMajor(newVersion)}`;
		case "widen":
			if (matches(newVersion, currentValue)) return currentValue;
			return `${lower} <= v < ${isGreaterThanOrEqual(newVersion, upper) ? nextMajor(newVersion) : upper}`;
		case "replace": return `${newVersion} <= v < ${nextMajor(newVersion)}`;
		case "update-lockfile":
			if (matches(newVersion, currentValue)) return currentValue;
			return `${newVersion} <= v < ${nextMajor(newVersion)}`;
		default: return null;
	}
}
const api = {
	equals,
	getMajor,
	getMinor,
	getNewValue,
	getPatch,
	isCompatible,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable: isStableVersion,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	sortVersions
};
//#endregion
export { api, api as default, isValid, isVersion };

//# sourceMappingURL=index.js.map