import { regEx } from "../../../util/regex.js";
import { isUndefined } from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/versioning/semver-partial/index.ts
const id = "semver-partial";
function isLatest(input) {
	return input === "~latest";
}
function massageValue(input) {
	return input.trim().replace(regEx(/^v/i), "");
}
function parseVersion(input) {
	return semver.parse(massageValue(input));
}
function parseRange(input) {
	const stripped = massageValue(input);
	const coerced = semver.coerce(stripped);
	if (!coerced) return null;
	const { major, minor } = coerced;
	if (regEx(/^\d+$/).test(stripped)) return { major };
	return {
		major,
		minor
	};
}
function isValid(input) {
	return isLatest(input) || !!parseVersion(input) || !!parseRange(input);
}
function isVersion(input) {
	if (!input) return false;
	return !!parseVersion(input);
}
function isStable(version) {
	const v = parseVersion(version);
	if (!v) return false;
	return v.prerelease.length === 0;
}
function isSingleVersion(input) {
	return isVersion(input);
}
function getMajor(version) {
	return parseVersion(version)?.major ?? null;
}
function getMinor(version) {
	return parseVersion(version)?.minor ?? null;
}
function getPatch(version) {
	return parseVersion(version)?.patch ?? null;
}
function sortVersions(x, y) {
	const a = parseVersion(x);
	const b = parseVersion(y);
	if (!a || !b) return 0;
	return semver.compare(a, b);
}
function equals(x, y) {
	const a = parseVersion(x);
	const b = parseVersion(y);
	if (!a || !b) return false;
	return semver.eq(a, b);
}
function isGreaterThan(x, y) {
	const a = parseVersion(x);
	const b = parseVersion(y);
	if (!a || !b) return false;
	return semver.gt(a, b);
}
function matches(version, range) {
	const v = parseVersion(version);
	if (!v) return false;
	if (isLatest(range)) return true;
	const rv = parseVersion(range);
	if (rv) return semver.eq(v, rv);
	const r = parseRange(range);
	if (!r) return false;
	if (v.prerelease.length > 0) return false;
	if (v.major !== r.major) return false;
	if (isUndefined(r.minor)) return true;
	return v.minor === r.minor;
}
function getSatisfyingVersion(versions, range) {
	const sortedVersions = versions.sort(sortVersions).reverse();
	for (const version of sortedVersions) if (matches(version, range)) return version;
	return null;
}
function minSatisfyingVersion(versions, range) {
	const sortedVersions = versions.sort(sortVersions);
	for (const version of sortedVersions) if (matches(version, range)) return version;
	return null;
}
function isLessThanRange(version, range) {
	const v = parseVersion(version);
	const r = parseRange(range);
	if (!v || !r) return false;
	if (v.major !== r.major) return v.major < r.major;
	if (isUndefined(r.minor)) return false;
	if (v.minor !== r.minor) return v.minor < r.minor;
	return false;
}
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	if (rangeStrategy === "pin") return newVersion;
	if (isLatest(currentValue)) return currentValue;
	const range = parseRange(currentValue);
	if (!range) return newVersion;
	const newParsed = parseVersion(newVersion);
	if (!newParsed) return newVersion;
	if (parseVersion(currentValue)) return newVersion;
	const [prefix] = currentValue.split(massageValue(currentValue));
	if (isUndefined(range.minor)) return `${prefix}${newParsed.major}`;
	return `${prefix}${newParsed.major}.${newParsed.minor}`;
}
function isCompatible(version) {
	return isValid(version);
}
function isBreaking(version, current) {
	const versionParsed = parseVersion(version);
	const currentParsed = parseVersion(current);
	if (!versionParsed || !currentParsed) return false;
	if (currentParsed.major === 0) return versionParsed.major > 0 || versionParsed.minor > currentParsed.minor;
	return versionParsed.major > currentParsed.major;
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
export { api, api as default, id };

//# sourceMappingURL=index.js.map