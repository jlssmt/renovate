import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isUndefined } from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/versioning/github-actions/index.ts
const id = "github-actions";
const floatingMinorTagRegex = regEx(/^\d+(?:\.\d+)?$/);
const majorOnlyRegex = regEx(/^\d+$/);
function massageValue(input) {
	return input.trim().replace(regEx(/^v/i), "");
}
function parseVersion(input) {
	const stripped = massageValue(input);
	const v = semver.parse(stripped);
	if (v) return v;
	return semver.parse(stripped.replace(regEx(/^(?<majorMinor>\d+\.\d+)(?<prerelease>-.+)$/), "$<majorMinor>.0$<prerelease>"));
}
function parseRange(input) {
	const stripped = massageValue(input);
	if (!floatingMinorTagRegex.test(stripped)) return null;
	const coerced = semver.coerce(stripped);
	/* v8 ignore if -- unreachable: floatingMinorTagRegex should guarantee coerce() succeeds */
	if (!coerced) return null;
	const { major, minor } = coerced;
	if (majorOnlyRegex.test(stripped)) return { major };
	return {
		major,
		minor
	};
}
function parseVersionCoerced(input) {
	const v = parseVersion(input);
	if (v) return v;
	const stripped = massageValue(input);
	if (!regEx(/^\d/).test(stripped)) return null;
	return semver.coerce(stripped);
}
function isValid(input) {
	return !!parseVersion(input) || !!parseRange(input);
}
function isVersion(input) {
	if (!input) return false;
	if (parseVersion(input)) return true;
	const stripped = massageValue(input);
	if (!regEx(/^\d/).test(stripped)) return false;
	return parseRange(input) !== null;
}
function isStable(version) {
	const v = parseVersionCoerced(version);
	if (!v) return false;
	return v.prerelease.length === 0;
}
function isSingleVersion(input) {
	return !!parseVersion(input);
}
function getMajor(version) {
	return parseVersionCoerced(version)?.major ?? null;
}
function getMinor(version) {
	return parseVersionCoerced(version)?.minor ?? null;
}
function getPatch(version) {
	return parseVersionCoerced(version)?.patch ?? null;
}
function sortVersions(x, y) {
	const a = parseVersionCoerced(x);
	const b = parseVersionCoerced(y);
	if (!a || !b) return 0;
	const cmp = semver.compare(a, b);
	if (cmp === 0) return x.localeCompare(y, void 0, { numeric: true });
	return cmp;
}
function equals(x, y) {
	const a = parseVersionCoerced(x);
	const b = parseVersionCoerced(y);
	if (!a || !b) return false;
	return semver.eq(a, b);
}
function isGreaterThan(x, y) {
	const a = parseVersionCoerced(x);
	const b = parseVersionCoerced(y);
	if (!a || !b) return false;
	return semver.gt(a, b);
}
function matches(version, range) {
	if (parseVersionCoerced(version) && massageValue(version) === massageValue(range)) return true;
	const v = parseVersion(version);
	if (!v) return false;
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
	const v = parseVersionCoerced(version);
	const r = parseRange(range);
	if (!v || !r) return false;
	if (v.major !== r.major) return v.major < r.major;
	if (isUndefined(r.minor)) return false;
	if (v.minor !== r.minor) return v.minor < r.minor;
	return false;
}
function getNewValue({ currentValue, currentVersion, rangeStrategy, newVersion, allVersions }) {
	if (rangeStrategy === "pin") return newVersion;
	const range = parseRange(currentValue);
	if (!range) return newVersion;
	const minLevel = isUndefined(range.minor) ? "major" : "minor";
	const [prefix] = currentValue.split(massageValue(currentValue));
	const newParsed = parseVersion(newVersion);
	if (!newParsed) {
		const newCoerced = parseVersionCoerced(newVersion);
		if (newCoerced) {
			const shortest = getShortestMatchingVersion(prefix, newCoerced, allVersions ?? /* @__PURE__ */ new Set(), minLevel);
			if (shortest) return shortest;
		}
		return newVersion;
	}
	// v8 ignore if -- currentValue can't fail both parseRange and parseVersion
	if (parseVersion(currentValue)) return newVersion;
	if (isUndefined(allVersions) || allVersions.size === 0) {
		if (isUndefined(range.minor)) return `${prefix}${newParsed.major}`;
		return `${prefix}${newParsed.major}.${newParsed.minor}`;
	}
	if (isUndefined(range.minor) && newParsed.major === range.major) return `${prefix}${newParsed.major}`;
	const shortest = getShortestMatchingVersion(prefix, newParsed, allVersions, minLevel);
	if (shortest) return shortest;
	logger.once.debug({
		versioning: id,
		currentValue,
		currentVersion,
		newVersion,
		rangeStrategy,
		allVersions
	}, `Suggested newValue \`${newVersion}\` was not included in allVersions, but it should have been. Returning it anyway`);
	return newVersion;
}
function getShortestMatchingVersion(prefix, newParsed, allVersions, minLevel = "major") {
	const { major, minor, patch } = newParsed;
	const versions = new Set(allVersions);
	if (minLevel === "major") {
		const v = `${prefix}${major}`;
		if (versions.has(v)) return v;
	}
	const v = `${prefix}${major}.${minor}`;
	if (versions.has(v)) return v;
	const patchVersion = `${prefix}${major}.${minor}.${patch}`;
	if (versions.has(patchVersion)) return patchVersion;
	const fullVersion = `${prefix}${newParsed.toString()}`;
	if (versions.has(fullVersion)) return fullVersion;
	return null;
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