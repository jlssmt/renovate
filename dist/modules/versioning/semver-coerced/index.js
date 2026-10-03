import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { regEx } from "../../../util/regex.js";
import { isBreaking as isBreaking$1 } from "../semver/index.js";
import { isString } from "@sindresorhus/is";
import semver from "semver";
import stable from "semver-stable";
//#region lib/modules/versioning/semver-coerced/index.ts
var semver_coerced_exports = /* @__PURE__ */ __exportAll({
	api: () => api,
	default: () => api,
	displayName: () => displayName,
	getSatisfyingVersion: () => getSatisfyingVersion,
	id: () => id,
	isValid: () => isVersion,
	isVersion: () => isVersion,
	supportsRanges: () => false,
	urls: () => urls
});
const id = "semver-coerced";
const displayName = "Coerced Semantic Versioning";
const urls = ["[Semantic Versioning](https://semver.org/)"];
function isStable(version) {
	const m = regEx(/^v?(?<major>\d+)(?<minor>\.\d+)?(?<patch>\.\d+)?(?<others>.+)?/).exec(version);
	if (!m?.groups) return false;
	const major = m.groups.major;
	const newMinor = m.groups.minor ?? ".0";
	const newPatch = m.groups.patch ?? ".0";
	const others = m.groups.others ?? "";
	const fixed = major + newMinor + newPatch + others;
	return stable.is(fixed);
}
function sortVersions(a, b) {
	const aCoerced = semver.coerce(a);
	const bCoerced = semver.coerce(b);
	return aCoerced && bCoerced ? semver.compare(aCoerced, bCoerced) : 0;
}
function getMajor(a) {
	const aCoerced = semver.coerce(a);
	return aCoerced ? semver.major(aCoerced) : null;
}
function getMinor(a) {
	const aCoerced = semver.coerce(a);
	return aCoerced ? semver.minor(aCoerced) : null;
}
function getPatch(a) {
	const aCoerced = semver.coerce(a);
	return aCoerced ? semver.patch(aCoerced) : null;
}
function matches(version, range) {
	const coercedVersion = semver.coerce(version);
	return coercedVersion ? semver.satisfies(coercedVersion, range) : false;
}
function equals(a, b) {
	const aCoerced = semver.coerce(a);
	const bCoerced = semver.coerce(b);
	return aCoerced && bCoerced ? semver.eq(aCoerced, bCoerced) : false;
}
function isValid(version) {
	return !!semver.valid(semver.coerce(version));
}
function getSatisfyingVersion(versions, range) {
	const coercedVersions = versions.map((version) => semver.valid(version) ? version : semver.coerce(version)?.version).filter(isString);
	return semver.maxSatisfying(coercedVersions, range);
}
function minSatisfyingVersion(versions, range) {
	const coercedVersions = versions.map((version) => semver.coerce(version)?.version).filter(isString);
	return semver.minSatisfying(coercedVersions, range);
}
function isLessThanRange(version, range) {
	const coercedVersion = semver.coerce(version);
	return coercedVersion ? semver.ltr(coercedVersion, range) : false;
}
function isGreaterThan(version, other) {
	const coercedVersion = semver.coerce(version);
	const coercedOther = semver.coerce(other);
	if (!coercedVersion || !coercedOther) return false;
	return semver.gt(coercedVersion, coercedOther);
}
const startsWithNumberRegex = regEx(`^\\d`);
function isSingleVersion(version) {
	if (!version.startsWith("v") && !startsWithNumberRegex.exec(version)) return false;
	return !!semver.valid(semver.coerce(version));
}
function isVersion(input) {
	return isValid(input);
}
function getNewValue({ currentValue, currentVersion, newVersion }) {
	if (currentVersion === `v${currentValue}`) return newVersion.replace(regEx(/^v/), "");
	return newVersion;
}
function isBreaking(version, current) {
	const coercedVersion = semver.coerce(version)?.toString();
	const coercedCurrent = semver.coerce(current)?.toString();
	return !!(coercedVersion && coercedCurrent && isBreaking$1(coercedVersion, coercedCurrent));
}
function isCompatible(version) {
	return isVersion(version);
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
export { api, api as default, displayName, getSatisfyingVersion, id, isVersion as isValid, isVersion, semver_coerced_exports, urls };

//# sourceMappingURL=index.js.map