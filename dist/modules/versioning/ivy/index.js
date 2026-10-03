import { autoExtendMavenRange, isSubversion, tokenize } from "../maven/compare.js";
import { api as api$1 } from "../maven/index.js";
import { LATEST_REGEX, parseDynamicRevision } from "./parse.js";
const { equals, getMajor, getMinor, getPatch, isGreaterThan, isStable, matches: mavenMatches, sortVersions } = api$1;
function isValid(str) {
	if (!str) return false;
	if (LATEST_REGEX.test(str)) return true;
	return isVersion(str) || !!parseDynamicRevision(str);
}
function isVersion(str) {
	if (!str) return false;
	if (LATEST_REGEX.test(str)) return false;
	if (str.includes("+")) return false;
	return api$1.isVersion(str);
}
function matches(a, b) {
	if (!a || !b) return false;
	const dynamicRevision = parseDynamicRevision(b);
	if (!dynamicRevision) return equals(a, b);
	const { type, value } = dynamicRevision;
	if (type === "REV_TYPE_LATEST") {
		if (!value) return true;
		const token = tokenize(a).at(-1);
		if (token.type === "TYPE_QUALIFIER") return token.val.toLowerCase() === value;
		return false;
	}
	if (type === "REV_TYPE_SUBREVISION") return isSubversion(value, a);
	return mavenMatches(a, value);
}
function getSatisfyingVersion(versions, range) {
	return versions.reduce((result, version) => {
		if (matches(version, range)) {
			if (!result) return version;
			if (isGreaterThan(version, result)) return version;
		}
		return result;
	}, null);
}
function getNewValue({ currentValue, newVersion }) {
	if (isVersion(currentValue)) return newVersion;
	return autoExtendMavenRange(currentValue, newVersion);
}
function isCompatible(version) {
	return isVersion(version);
}
function isSingleVersion(version) {
	return isVersion(version);
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	isCompatible,
	isGreaterThan,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion: getSatisfyingVersion,
	getNewValue,
	sortVersions
};
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map