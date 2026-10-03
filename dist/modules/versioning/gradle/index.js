import { regEx } from "../../../util/regex.js";
import { api as api$1 } from "../maven/index.js";
import { TokenType, compare, isValid, isVersion, parse, parseMavenBasedRange, parsePrefixRange, parseSingleVersionRange } from "./compare.js";
import { isBigint } from "@sindresorhus/is";
//#region lib/modules/versioning/gradle/index.ts
const id = "gradle";
const sectionIndexes = {
	major: 0,
	minor: 1,
	patch: 2
};
function equals(a, b) {
	return compare(a, b) === 0;
}
function getMajor(version) {
	const tokens = parse(version?.replace(regEx(/^v/i), ""));
	if (tokens) {
		const majorToken = tokens?.[0];
		if (majorToken?.type === TokenType.Number) return parseInt(majorToken.val.toString(), 10);
	}
	return null;
}
function getMinor(version) {
	const tokens = parse(version?.replace(regEx(/^v/i), ""));
	if (tokens) {
		const majorToken = tokens[0];
		const minorToken = tokens[1];
		if (majorToken?.type === TokenType.Number && minorToken?.type === TokenType.Number) return parseInt(minorToken.val.toString(), 10);
		return 0;
	}
	return null;
}
function getPatch(version) {
	const tokens = parse(version?.replace(regEx(/^v/i), ""));
	if (tokens) {
		const majorToken = tokens[0];
		const minorToken = tokens[1];
		const patchToken = tokens[2];
		if (majorToken?.type === TokenType.Number && minorToken?.type === TokenType.Number && patchToken?.type === TokenType.Number) return parseInt(patchToken.val.toString(), 10);
		return 0;
	}
	return null;
}
function isGreaterThan(a, b) {
	return compare(a, b) === 1;
}
function getExactSection(version, type) {
	const tokens = parse(version.replace(regEx(/^v/i), ""));
	if (!tokens) return null;
	const sectionIndex = sectionIndexes[type];
	if (sectionIndex === 0) {
		const token = tokens[sectionIndex];
		return token?.type === TokenType.Number && isBigint(token.val) ? token.val : null;
	}
	for (let index = 0; index <= sectionIndex; index += 1) if (tokens[index]?.type !== TokenType.Number) return 0n;
	return BigInt(tokens[sectionIndex].val);
}
function isSame(type, a, b) {
	if (!(isVersion(a) && isVersion(b))) return false;
	return getExactSection(a, type) === getExactSection(b, type);
}
const unstable = /* @__PURE__ */ new Set([
	"dev",
	"a",
	"alpha",
	"b",
	"beta",
	"m",
	"mt",
	"milestone",
	"rc",
	"cr",
	"preview",
	"snapshot"
]);
function isStable(version) {
	const tokens = parse(version);
	if (tokens) {
		for (const token of tokens) if (token.type === TokenType.String) {
			const val = token.val.toString().toLowerCase();
			if (unstable.has(val)) return false;
		}
		return true;
	}
	return false;
}
function matches(a, b) {
	const versionTokens = parse(a);
	if (!a || !versionTokens || !b) return false;
	if (isVersion(b)) return equals(a, b);
	const singleVersionRange = parseSingleVersionRange(b);
	if (singleVersionRange) {
		const { val } = singleVersionRange;
		return equals(a, val);
	}
	const prefixRange = parsePrefixRange(b);
	if (prefixRange) {
		const tokens = prefixRange.tokens;
		if (tokens.length === 0) return true;
		return equals(versionTokens.slice(0, tokens.length).map(({ val }) => val).join("."), tokens.map(({ val }) => val).join("."));
	}
	const mavenBasedRange = parseMavenBasedRange(b);
	if (!mavenBasedRange) return false;
	const { leftBound, leftVal, rightBound, rightVal } = mavenBasedRange;
	let leftResult = true;
	let rightResult = true;
	if (leftVal) leftResult = leftBound === "exclusive" ? compare(leftVal, a) === -1 : compare(leftVal, a) !== 1;
	if (rightVal) rightResult = rightBound === "exclusive" ? compare(a, rightVal) === -1 : compare(a, rightVal) !== 1;
	return leftResult && rightResult;
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
function minSatisfyingVersion(versions, range) {
	return versions.reduce((result, version) => {
		if (matches(version, range)) {
			if (!result) return version;
			if (compare(version, result) === -1) return version;
		}
		return result;
	}, null);
}
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	if (isVersion(currentValue)) return newVersion;
	const prefixRange = parsePrefixRange(currentValue);
	const parsedNewVersion = parse(newVersion);
	if (prefixRange && parsedNewVersion) {
		if (prefixRange.tokens.length > 0) {
			if (prefixRange.tokens.length <= parsedNewVersion.length) return `${prefixRange.tokens.map((_, i) => parsedNewVersion[i].val).join(".")}.+`;
			return newVersion;
		}
		return null;
	}
	const mavenRange = parseMavenBasedRange(currentValue);
	if (mavenRange?.preferredVal) {
		const { leftVal, rightVal, preferredVal } = mavenRange;
		const baseRange = currentValue.slice(0, currentValue.lastIndexOf(`!!${preferredVal}`));
		const newBaseRange = api$1.getNewValue({
			currentValue: baseRange,
			rangeStrategy,
			newVersion
		});
		// v8 ignore if: the implementation has a non-null return type
		if (newBaseRange === null) return null;
		const preferredIsBoundary = preferredVal === leftVal || preferredVal === rightVal;
		const newParsed = parseMavenBasedRange(newBaseRange);
		const preferredStillPresent = newParsed?.leftVal === preferredVal || newParsed?.rightVal === preferredVal;
		return `${newBaseRange}!!${preferredIsBoundary && !preferredStillPresent ? newVersion : preferredVal}`;
	}
	return api$1.getNewValue({
		currentValue,
		rangeStrategy,
		newVersion
	});
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
	minSatisfyingVersion,
	getNewValue,
	sortVersions: compare
};
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map