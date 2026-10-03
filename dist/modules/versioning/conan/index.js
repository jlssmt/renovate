import { api as api$1 } from "../loose/index.js";
import { cleanVersion, findSatisfyingVersion, getOptions, makeVersion, matchesWithOptions } from "./common.js";
import { bumpRange, getMajor, getMinor, getPatch, replaceRange, widenRange } from "./range.js";
import * as semver$1 from "semver";
//#region lib/modules/versioning/conan/index.ts
const id = "conan";
const MIN = 1;
const MAX = -1;
function isVersion(input) {
	if (input && !input.includes("[")) {
		const qualifiers = getOptions(input);
		const version = cleanVersion(input);
		if (qualifiers.loose && api$1.isVersion(version)) return true;
		return makeVersion(version, qualifiers) !== null;
	}
	return false;
}
function isValid(input) {
	const version = cleanVersion(input);
	const qualifiers = getOptions(input);
	if (makeVersion(version, qualifiers)) return version !== null;
	return semver$1.validRange(version, qualifiers) !== null;
}
function equals(version, other) {
	const cleanedVersion = cleanVersion(version);
	const cleanOther = cleanVersion(other);
	const options = {
		loose: true,
		includePrerelease: true
	};
	const looseResult = api$1.equals(cleanedVersion, cleanOther);
	try {
		return semver$1.eq(cleanedVersion, cleanOther, options) || looseResult;
	} catch {
		return looseResult;
	}
}
function isGreaterThan(version, other) {
	const cleanedVersion = cleanVersion(version);
	const cleanOther = cleanVersion(other);
	const options = {
		loose: true,
		includePrerelease: true
	};
	const looseResult = api$1.isGreaterThan(cleanedVersion, cleanOther);
	try {
		return semver$1.gt(cleanedVersion, cleanOther, options) || looseResult;
	} catch {
		return looseResult;
	}
}
function isLessThanRange(version, range) {
	const cleanedVersion = cleanVersion(version);
	const cleanRange = cleanVersion(range);
	const options = getOptions(range);
	const looseResult = api$1.isLessThanRange?.(cleanedVersion, cleanRange);
	try {
		return semver$1.ltr(cleanedVersion, cleanRange, options) || looseResult;
	} catch {
		return looseResult;
	}
}
function sortVersions(version, other) {
	const cleanedVersion = cleanVersion(version);
	const cleanOther = cleanVersion(other);
	const options = {
		loose: true,
		includePrerelease: true
	};
	try {
		return semver$1.compare(cleanedVersion, cleanOther, options);
	} catch {
		return api$1.sortVersions(cleanedVersion, cleanOther);
	}
}
function matches(version, range) {
	if (isVersion(version) && isVersion(range)) return true;
	const cleanedVersion = cleanVersion(version);
	const options = getOptions(range);
	const cleanRange = cleanVersion(range);
	return matchesWithOptions(cleanedVersion, cleanRange, options);
}
function isCompatible(version, range) {
	if (isVersion(version) && isVersion(range)) return true;
	const options = getOptions(range);
	if (makeVersion(version, options)) return !isLessThanRange(version, range);
	return false;
}
function isStable(version) {
	const cleanedVersion = cleanVersion(version);
	const options = getOptions(version);
	if (!options.includePrerelease && semver$1.prerelease(cleanedVersion, options)) return false;
	return true;
}
function minSatisfyingVersion(versions, range) {
	return findSatisfyingVersion(versions, range, MIN);
}
function getSatisfyingVersion(versions, range) {
	return findSatisfyingVersion(versions, range, MAX);
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	const cleanRange = cleanVersion(currentValue);
	if (isVersion(currentValue)) return newVersion;
	const options = getOptions(currentValue);
	if (semver$1.validRange(cleanRange, options) === "*") return currentValue;
	let newValue = "";
	if (rangeStrategy === "widen") newValue = widenRange({
		currentValue: cleanRange,
		rangeStrategy,
		currentVersion,
		newVersion
	}, options);
	else if (rangeStrategy === "bump") newValue = bumpRange({
		currentValue: cleanRange,
		rangeStrategy,
		currentVersion,
		newVersion
	}, options);
	else newValue = replaceRange({
		currentValue: cleanRange,
		rangeStrategy,
		currentVersion,
		newVersion
	});
	if (newValue) return currentValue.replace(cleanRange, newValue);
	return null;
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
export { api, api as default, id };

//# sourceMappingURL=index.js.map