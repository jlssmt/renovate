import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { DistroInfo } from "../distro.js";
import { getDatedContainerImageCodename, getDatedContainerImageSuffix, getDatedContainerImageVersion, isDatedCodeName } from "./common.js";
//#region lib/modules/versioning/ubuntu/index.ts
const id = "ubuntu";
const displayName = "Ubuntu";
const urls = ["[Ubuntu meta-release](https://changelogs.ubuntu.com/meta-release)", "[Ubuntu distro info data](https://debian.pages.debian.net/distro-info-data/ubuntu.csv)"];
const supportsRanges = false;
const di = new DistroInfo("data/ubuntu-distro-info.json");
function isValid(input) {
	if (regEx(/^(?:0[4-5]|[6-9]|[1-9][0-9])\.[0-9][0-9](?:\.[0-9]{1,2})?$/).test(input)) return true;
	if (di.isCodename(input)) return true;
	return isDatedCodeName(input);
}
function isVersion(input) {
	return isValid(input);
}
function isCompatible(version, _current) {
	return isValid(version);
}
function isSingleVersion(version) {
	return isValid(version);
}
function isStable(version) {
	const ver = di.getVersionByCodename(version);
	if (!isValid(ver)) return false;
	const match = ver.match(regEx(/^\d+.\d+/));
	if (!di.isReleased(coerceString(match?.[0], ver))) return false;
	return regEx(/^\d?[02468]\.04/).test(ver);
}
function getVersionByCodename(version) {
	const getVersion = getDatedContainerImageCodename(version) ?? version;
	return di.getVersionByCodename(getVersion);
}
function getMajor(version) {
	const ver = getVersionByCodename(version);
	if (isValid(ver)) {
		const [major] = ver.split(".");
		return parseInt(major, 10);
	}
	return null;
}
function getMinor(version) {
	const ver = getVersionByCodename(version);
	if (isValid(ver)) {
		const [, minor] = ver.split(".");
		return parseInt(minor, 10);
	}
	return null;
}
function getPatch(version) {
	const ver = getVersionByCodename(version);
	if (isValid(ver)) {
		const [, , patch] = ver.split(".");
		return patch ? parseInt(patch, 10) : null;
	}
	return null;
}
function equals(version, other) {
	if (getDatedContainerImageVersion(version) !== getDatedContainerImageVersion(other)) return false;
	if (getDatedContainerImageSuffix(version) !== getDatedContainerImageSuffix(other)) return false;
	const ver = getVersionByCodename(version);
	const otherVer = getVersionByCodename(other);
	return isVersion(ver) && isVersion(otherVer) && ver === otherVer;
}
function isGreaterThan(version, other) {
	const xMajor = getMajor(version) ?? 0;
	const yMajor = getMajor(other) ?? 0;
	if (xMajor > yMajor) return true;
	if (xMajor < yMajor) return false;
	const xMinor = getMinor(version) ?? 0;
	const yMinor = getMinor(other) ?? 0;
	if (xMinor > yMinor) return true;
	if (xMinor < yMinor) return false;
	const xImageVersion = getDatedContainerImageVersion(version) ?? 0;
	const yImageVersion = getDatedContainerImageVersion(other) ?? 0;
	if (xImageVersion > yImageVersion) return true;
	if (xImageVersion < yImageVersion) return false;
	const xSuffixVersion = getDatedContainerImageSuffix(version) ?? 0;
	const ySuffixVersion = getDatedContainerImageSuffix(other) ?? 0;
	if (xSuffixVersion > ySuffixVersion) return true;
	if (xSuffixVersion < ySuffixVersion) return false;
	return (getPatch(version) ?? 0) > (getPatch(other) ?? 0);
}
function getSatisfyingVersion(versions, range) {
	return versions.find((version) => equals(version, range)) ? range : null;
}
function minSatisfyingVersion(versions, range) {
	return getSatisfyingVersion(versions, range);
}
function getNewValue({ currentValue, newVersion }) {
	if (di.isCodename(currentValue)) return di.getCodenameByVersion(newVersion);
	return di.getVersionByCodename(newVersion);
}
function sortVersions(version, other) {
	if (equals(version, other)) return 0;
	if (isGreaterThan(version, other)) return 1;
	return -1;
}
function matches(version, range) {
	return equals(version, range);
}
const api = {
	isCompatible,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	getMajor,
	getMinor,
	getPatch,
	equals,
	isGreaterThan,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue,
	sortVersions,
	matches
};
//#endregion
export { api, api as default, displayName, id, supportsRanges, urls };

//# sourceMappingURL=index.js.map