import { coerceString } from "../../../util/string.js";
import { QualifierTypes, autoExtendMavenRange, compare, isSingleVersion as isVersion, isValid, parseRange, qualifierType, tokenize } from "./compare.js";
//#region lib/modules/versioning/maven/index.ts
const id = "maven";
const sectionIndexes = {
	major: 0,
	minor: 1,
	patch: 2
};
function equals(a, b) {
	return compare(a, b) === 0;
}
function matches(a, b) {
	if (!b) return false;
	if (isVersion(b)) return equals(a, b);
	const ranges = parseRange(b);
	if (!ranges) return false;
	return ranges.reduce((result, range) => {
		if (result) return result;
		const { leftType, leftValue, rightType, rightValue } = range;
		let leftResult = true;
		let rightResult = true;
		if (leftValue) leftResult = leftType === "EXCLUDING_POINT" ? compare(leftValue, a) === -1 : compare(leftValue, a) !== 1;
		if (rightValue) rightResult = rightType === "EXCLUDING_POINT" ? compare(a, rightValue) === -1 : compare(a, rightValue) !== 1;
		return leftResult && rightResult;
	}, false);
}
function getMajor(version) {
	if (isVersion(version)) {
		const majorToken = tokenize(version)[0];
		return parseInt(majorToken.val.toString(), 10);
	}
	return null;
}
function getMinor(version) {
	if (isVersion(version)) {
		const minorToken = tokenize(version)[1];
		if (minorToken?.type === "TYPE_NUMBER") return parseInt(minorToken.val.toString(), 10);
		return 0;
	}
	return null;
}
function getPatch(version) {
	if (isVersion(version)) {
		const tokens = tokenize(version);
		const minorToken = tokens[1];
		const patchToken = tokens[2];
		if (patchToken && minorToken.type === "TYPE_NUMBER" && patchToken.type === "TYPE_NUMBER") return parseInt(patchToken.val.toString(), 10);
		return 0;
	}
	return null;
}
function isGreaterThan(a, b) {
	return compare(a, b) === 1;
}
function getExactSection(version, type) {
	const tokens = tokenize(version);
	const sectionIndex = sectionIndexes[type];
	const token = tokens[sectionIndex];
	if (sectionIndex === 0) return token?.type === "TYPE_NUMBER" ? token.val : null;
	if (sectionIndex === 1) return token?.type === "TYPE_NUMBER" ? token.val : 0n;
	return tokens[1]?.type === "TYPE_NUMBER" && token?.type === "TYPE_NUMBER" ? token.val : 0n;
}
function isSame(type, a, b) {
	if (!(isVersion(a) && isVersion(b))) return false;
	return getExactSection(a, type) === getExactSection(b, type);
}
function isStable(version) {
	if (isVersion(version)) {
		const tokens = tokenize(version);
		for (const token of tokens) if (token.type === "TYPE_QUALIFIER") {
			const qualType = qualifierType(token);
			if (qualType && qualType < QualifierTypes.Release) return false;
		}
		return true;
	}
	return false;
}
// istanbul ignore next
function getSatisfyingVersion(versions, range) {
	return versions.reduce((result, version) => {
		if (matches(version, range)) {
			if (!result) return version;
			if (isGreaterThan(version, result)) return version;
		}
		return result;
	}, null);
}
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	if (isVersion(currentValue) || rangeStrategy === "pin") return newVersion;
	return coerceString(autoExtendMavenRange(currentValue, newVersion), currentValue);
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	isCompatible: isVersion,
	isGreaterThan,
	isSingleVersion: isVersion,
	isSame,
	isStable,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion: getSatisfyingVersion,
	getNewValue,
	sortVersions: compare
};
//#endregion
export { api, api as default, id, isValid };

//# sourceMappingURL=index.js.map