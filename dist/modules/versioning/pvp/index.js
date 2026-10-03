import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseRange } from "./range.js";
import { compareIntArray, extractAllParts, getParts, plusOne } from "./util.js";
import { isString } from "@sindresorhus/is";
const digitsAndDots = regEx(/^[\d.]+$/);
function isGreaterThan(version, other) {
	const versionIntMajor = extractAllParts(version);
	const otherIntMajor = extractAllParts(other);
	if (versionIntMajor === null || otherIntMajor === null) return false;
	return compareIntArray(versionIntMajor, otherIntMajor) === "gt";
}
function getMajor(version) {
	const parts = getParts(version);
	if (parts === null) return null;
	return parseFloat(parts.major.join("."));
}
function getMinor(version) {
	const parts = getParts(version);
	if (parts === null || parts.minor.length === 0) return null;
	return parseFloat(parts.minor.join("."));
}
function getPatch(version) {
	const parts = getParts(version);
	if (parts === null || parts.patch.length === 0) return null;
	return parseFloat(`${parts.patch[0]}.${parts.patch.slice(1).join("")}`);
}
function matches(version, range) {
	const parsed = parseRange(range);
	if (parsed === null) return false;
	const ver = extractAllParts(version);
	const lower = extractAllParts(parsed.lower);
	const upper = extractAllParts(parsed.upper);
	if (ver === null || lower === null || upper === null) return false;
	return "gt" === compareIntArray(upper, ver) && ["eq", "lt"].includes(compareIntArray(lower, ver));
}
function satisfyingVersion(versions, range, reverse) {
	const copy = versions.slice(0);
	copy.sort((a, b) => {
		const multiplier = reverse ? 1 : -1;
		return sortVersions(a, b) * multiplier;
	});
	return copy.find((v) => matches(v, range)) ?? null;
}
function getSatisfyingVersion(versions, range) {
	return satisfyingVersion(versions, range, false);
}
function minSatisfyingVersion(versions, range) {
	return satisfyingVersion(versions, range, true);
}
function isLessThanRange(version, range) {
	const parsed = parseRange(range);
	if (parsed === null) return false;
	const compos = extractAllParts(version);
	const lower = extractAllParts(parsed.lower);
	if (compos === null || lower === null) return false;
	return "lt" === compareIntArray(compos, lower);
}
function getNewValue({ currentValue, newVersion, rangeStrategy }) {
	if (rangeStrategy !== "widen") {
		logger.info({
			rangeStrategy,
			currentValue,
			newVersion
		}, `PVP can't handle this range strategy.`);
		return null;
	}
	const parsed = parseRange(currentValue);
	if (parsed === null) {
		logger.info({
			currentValue,
			newVersion
		}, "could not parse PVP version range");
		return null;
	}
	if (isLessThanRange(newVersion, currentValue)) return null;
	if (matches(newVersion, currentValue)) return null;
	const compos = getParts(newVersion);
	if (compos === null) return null;
	const majorPlusOne = plusOne(compos.major);
	// istanbul ignore next: since all versions that can be parsed, can also be bumped, this can never happen
	if (!matches(newVersion, `>=${parsed.lower} && <${majorPlusOne}`)) {
		logger.warn({ newVersion }, "Even though the major bound was bumped, the newVersion still isn't accepted.");
		return null;
	}
	return `>=${parsed.lower} && <${majorPlusOne}`;
}
function isSame(type, a, b) {
	const aParts = getParts(a);
	const bParts = getParts(b);
	if (aParts === null || bParts === null) return false;
	if (type === "major") return "eq" === compareIntArray(aParts.major, bParts.major);
	if (type === "minor") return "eq" === compareIntArray(aParts.minor, bParts.minor);
	return "eq" === compareIntArray(aParts.patch, bParts.patch);
}
function subset(subRange, superRange) {
	const sub = parseRange(subRange);
	const sup = parseRange(superRange);
	if (sub === null || sup === null) return;
	const subLower = extractAllParts(sub.lower);
	const subUpper = extractAllParts(sub.upper);
	const supLower = extractAllParts(sup.lower);
	const supUpper = extractAllParts(sup.upper);
	if (subLower === null || subUpper === null || supLower === null || supUpper === null) return;
	if ("lt" === compareIntArray(subLower, supLower)) return false;
	if ("gt" === compareIntArray(subUpper, supUpper)) return false;
	return true;
}
function isVersion(maybeRange) {
	return isString(maybeRange) && parseRange(maybeRange) === null;
}
function isValid(ver) {
	return extractAllParts(ver) !== null || parseRange(ver) !== null;
}
function isSingleVersion(range) {
	const noSpaces = range.trim();
	return noSpaces.startsWith("==") && digitsAndDots.test(noSpaces.slice(2));
}
function equals(a, b) {
	const aParts = extractAllParts(a);
	const bParts = extractAllParts(b);
	if (aParts === null || bParts === null) return false;
	return "eq" === compareIntArray(aParts, bParts);
}
function sortVersions(a, b) {
	if (equals(a, b)) return 0;
	return isGreaterThan(a, b) ? 1 : -1;
}
function isStable(_version) {
	return true;
}
function isCompatible(_version) {
	return true;
}
const api = {
	isValid,
	isVersion,
	isStable,
	isCompatible,
	getMajor,
	getMinor,
	getPatch,
	isSingleVersion,
	sortVersions,
	equals,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	isLessThanRange,
	isGreaterThan,
	getNewValue,
	isSame,
	subset
};
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map