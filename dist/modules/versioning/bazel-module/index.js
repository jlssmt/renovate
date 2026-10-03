import { regEx } from "../../../util/regex.js";
import { BzlmodVersion } from "./bzlmod-version.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/versioning/bazel-module/index.ts
const id = "bazel-module";
function getBzlmodVersion(version) {
	return new BzlmodVersion(version);
}
function getMajor(version) {
	return getBzlmodVersion(version).release.major;
}
function getMinor(version) {
	return getBzlmodVersion(version).release.minor;
}
function getPatch(version) {
	return getBzlmodVersion(version).release.patch;
}
/**
* Check whether `version` and `other` are logically equivalent, even if
* they're not the exact same string.
*
* For example, with Semver the build metadata should be ignored when comparing.
*/
function equals(version, other) {
	const abv = new BzlmodVersion(version);
	const bbv = new BzlmodVersion(other);
	return abv.equals(bbv);
}
/**
* Check whether `version` is "greater" than the `other` version.
*/
function isGreaterThan(version, other) {
	const abv = new BzlmodVersion(version);
	const bbv = new BzlmodVersion(other);
	return abv.isGreaterThan(bbv);
}
/**
* Check whether the `version` is "less" than all the versions possible in
* the `range`.
*/
function isLessThanRange(version, range) {
	const abv = new BzlmodVersion(version);
	const bbv = new BzlmodVersion(range);
	return abv.isLessThan(bbv);
}
/**
* Select the highest version from `versions` that is within the given
* `range` constraint, or return `null` if there is no matching version.
*/
function getSatisfyingVersion(versions, range) {
	const target = new BzlmodVersion(range);
	return versions.find((ver) => {
		const bv = new BzlmodVersion(ver);
		return target.equals(bv);
	}) ? range : null;
}
/**
* Select the lowest version from `versions` that is within the given
* `range` constraint, or return `null` if there is no matching version.
*/
function minSatisfyingVersion(versions, range) {
	return getSatisfyingVersion(versions, range);
}
/**
* Calculate a new version constraint based on the current constraint, the
* `rangeStrategy` option, and the current and new version.
*/
function getNewValue({ currentValue, currentVersion, newVersion }) {
	if (currentVersion === `v${currentValue}`) return newVersion.replace(regEx(/^v/), "");
	return newVersion;
}
/**
* Compare two versions. Return `0` if `v1 == v2`, or `1` if `v1` is
* greater, or `-1` if `v2` is greater.
*/
function sortVersions(version, other) {
	const abv = new BzlmodVersion(version);
	const bbv = new BzlmodVersion(other);
	return BzlmodVersion.defaultCompare(abv, bbv);
}
/**
* Check whether the `version` satisfies the `range` constraint.
*/
function matches(version, range) {
	return equals(version, range);
}
/**
* Check whether the `version` is compatible with the `current` value
* constraint.
*/
function isCompatible(version, _current) {
	return isValid(version);
}
/**
* Check whether the `version` constraint is not a range, i.e. it only allows a
* single specific version.
*/
function isSingleVersion(version) {
	return isValid(version);
}
/**
* Check whether the `version` is considered to be "stable".
*
* Example: in SemVer the version must not have a pre-release marker.
*/
function isStable(version) {
	return !new BzlmodVersion(version).isPrerelease;
}
/**
* Check whether the `input` is a valid version or a valid version range constraint.
*/
function isValid(input) {
	try {
		new BzlmodVersion(input);
	} catch {
		return false;
	}
	return true;
}
/**
* Check whether the `input` is a valid version string.
*/
function isVersion(input) {
	if (isNullOrUndefined(input)) return false;
	return isValid(input);
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
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