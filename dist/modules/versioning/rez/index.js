import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { api as api$1 } from "../npm/index.js";
import { api as api$2 } from "../pep440/index.js";
import { ascendingRange, descendingRange, exactVersion, inclusiveBound, lowerBound, matchVersion, upperBound, versionGroup } from "./pattern.js";
import { npm2rezplus, padZeroes, pep4402rezInclusiveBound, rez2npm, rez2pep440 } from "./transform.js";
function equals(a, b) {
	try {
		return api$1.equals(padZeroes(a), padZeroes(b));
	} catch /* istanbul ignore next */ {
		return api$2.equals(a, b);
	}
}
function getMajor(version) {
	try {
		return api$1.getMajor(padZeroes(version));
	} catch /* istanbul ignore next */ {
		return api$2.getMajor(version);
	}
}
function getMinor(version) {
	try {
		return api$1.getMinor(padZeroes(version));
	} catch /* istanbul ignore next */ {
		return api$2.getMinor(version);
	}
}
function getPatch(version) {
	try {
		return api$1.getPatch(padZeroes(version));
	} catch /* istanbul ignore next */ {
		return api$2.getPatch(version);
	}
}
function isGreaterThan(a, b) {
	try {
		return api$1.isGreaterThan(padZeroes(a), padZeroes(b));
	} catch /* istanbul ignore next */ {
		return api$2.isGreaterThan(a, b);
	}
}
function isLessThanRange(version, range) {
	return api$1.isVersion(padZeroes(version)) && !!api$1.isLessThanRange?.(padZeroes(version), rez2npm(range));
}
function isValid(input) {
	return api$1.isValid(rez2npm(input));
}
function isStable(version) {
	return api$1.isStable(padZeroes(version));
}
function isVersion(input) {
	return api$1.isVersion(padZeroes(rez2npm(input)));
}
function matches(version, range) {
	return api$1.isVersion(padZeroes(version)) && api$1.matches(padZeroes(version), rez2npm(range));
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions, rez2npm(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions, rez2npm(range));
}
function isSingleVersion(constraint) {
	return constraint.trim().startsWith("==") && isVersion(constraint.trim().substring(2).trim()) || isVersion(constraint.trim());
}
function sortVersions(a, b) {
	return api$1.sortVersions(padZeroes(a), padZeroes(b));
}
function matchVersionPrecision(currentValue, newVersion) {
	if (!matchVersion.test(currentValue) || !isVersion(newVersion)) return null;
	const precision = currentValue.split(".").length;
	return newVersion.split(".").slice(0, precision).join(".");
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	const precisionMatchedVersion = matchVersionPrecision(currentValue, newVersion);
	if (precisionMatchedVersion) return precisionMatchedVersion;
	const pep440Value = api$2.getNewValue({
		currentValue: rez2pep440(currentValue),
		rangeStrategy,
		currentVersion,
		newVersion
	});
	if (exactVersion.test(currentValue)) return pep440Value;
	if (pep440Value && inclusiveBound.test(currentValue)) return pep4402rezInclusiveBound(pep440Value);
	if (pep440Value && lowerBound.test(currentValue)) {
		if (currentValue.includes("+")) return npm2rezplus(pep440Value);
		return pep440Value;
	}
	if (pep440Value && upperBound.test(currentValue)) return pep440Value;
	const matchAscRange = ascendingRange.exec(currentValue);
	if (pep440Value && matchAscRange?.groups) {
		const lowerBoundAscCurrent = matchAscRange.groups.range_lower_asc;
		const upperBoundAscCurrent = matchAscRange.groups.range_upper_asc;
		const lowerAscVersionCurrent = matchAscRange.groups.range_lower_asc_version;
		const upperAscVersionCurrent = matchAscRange.groups.range_upper_asc_version;
		const [lowerBoundAscPep440, upperBoundAscPep440] = pep440Value.split(", ");
		const lowerAscVersionNew = coerceString(regEx(versionGroup).exec(lowerBoundAscPep440)?.[0]);
		const upperAscVersionNew = coerceString(regEx(versionGroup).exec(upperBoundAscPep440)?.[0]);
		const lowerBoundAscNew = lowerBoundAscCurrent.replace(lowerAscVersionCurrent, lowerAscVersionNew);
		const upperBoundAscNew = upperBoundAscCurrent.replace(upperAscVersionCurrent, upperAscVersionNew);
		return lowerBoundAscNew + (currentValue.includes(",") ? "," : "") + upperBoundAscNew;
	}
	const matchDscRange = descendingRange.exec(currentValue);
	if (pep440Value && matchDscRange?.groups) {
		const upperBoundDescCurrent = matchDscRange.groups.range_upper_desc;
		const lowerBoundDescCurrent = matchDscRange.groups.range_lower_desc;
		const upperDescVersionCurrent = matchDscRange.groups.range_upper_desc_version;
		const lowerDescVersionCurrent = matchDscRange.groups.range_lower_desc_version;
		const [lowerBoundDescPep440, upperBoundDescPep440] = pep440Value.split(", ");
		const upperDescVersionNew = coerceString(regEx(versionGroup).exec(upperBoundDescPep440)?.[0]);
		const lowerDescVersionNew = coerceString(regEx(versionGroup).exec(lowerBoundDescPep440)?.[0]);
		const upperBoundDescNew = upperBoundDescCurrent.replace(upperDescVersionCurrent, upperDescVersionNew);
		const lowerBoundDescNew = lowerBoundDescCurrent.replace(lowerDescVersionCurrent, lowerDescVersionNew);
		return upperBoundDescNew + "," + lowerBoundDescNew;
	}
	return null;
}
function isCompatible(version) {
	return isVersion(version);
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	getNewValue,
	getSatisfyingVersion,
	isCompatible,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	minSatisfyingVersion,
	sortVersions
};
//#endregion
export { api, api as default, isValid };

//# sourceMappingURL=index.js.map