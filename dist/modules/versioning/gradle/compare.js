import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/versioning/gradle/compare.ts
const TokenType = {
	Number: 1,
	String: 2
};
function iterateChars(str, cb) {
	let prev = null;
	let next = null;
	for (let i = 0; i < str.length; i += 1) {
		next = str.charAt(i);
		cb(prev, next);
		prev = next;
	}
	cb(prev, null);
}
function isSeparator(char) {
	return regEx(/^[-._+]$/i).test(char);
}
function isDigit(char) {
	return regEx(/^\d$/).test(char);
}
function isLetter(char) {
	return !isSeparator(char) && !isDigit(char);
}
function isTransition(prevChar, nextChar) {
	return isDigit(prevChar) && isLetter(nextChar) || isLetter(prevChar) && isDigit(nextChar);
}
function tokenize(versionStr) {
	let result = [];
	let currentVal = "";
	function yieldToken() {
		if (result) {
			const val = currentVal;
			if (regEx(/^\d+$/).test(val)) result.push({
				type: TokenType.Number,
				val: BigInt(val)
			});
			else result.push({
				type: TokenType.String,
				val
			});
		}
	}
	iterateChars(versionStr, (prevChar, nextChar) => {
		if (nextChar === null) yieldToken();
		else if (isSeparator(nextChar)) {
			if (prevChar && !isSeparator(prevChar)) {
				yieldToken();
				currentVal = "";
			} else result = null;
		} else if (prevChar !== null && isTransition(prevChar, nextChar)) {
			yieldToken();
			currentVal = nextChar;
		} else currentVal = currentVal.concat(nextChar);
	});
	return result;
}
const QualifierRank = {
	Dev: -1,
	Default: 0,
	RC: 1,
	Snapshot: 2,
	Final: 3,
	GA: 4,
	Release: 5,
	SP: 6
};
function qualifierRank(input) {
	const val = input.toLowerCase();
	if (val === "dev") return QualifierRank.Dev;
	if (val === "rc" || val === "cr") return QualifierRank.RC;
	if (val === "snapshot") return QualifierRank.Snapshot;
	if (val === "ga") return QualifierRank.GA;
	if (val === "final") return QualifierRank.Final;
	if (val === "release" || val === "latest" || val === "sr") return QualifierRank.Release;
	if (val === "sp") return QualifierRank.SP;
	return QualifierRank.Default;
}
function stringTokenCmp(left, right) {
	const leftRank = qualifierRank(left);
	const rightRank = qualifierRank(right);
	if (leftRank === 0 && rightRank === 0) {
		if (left < right) return -1;
		if (left > right) return 1;
	} else {
		if (leftRank < rightRank) return -1;
		if (leftRank > rightRank) return 1;
	}
	return 0;
}
function tokenCmp(left, right) {
	if (left === null) {
		if (right?.type === TokenType.String) return 1;
		return -1;
	}
	if (right === null) {
		if (left.type === TokenType.String) return -1;
		return 1;
	}
	if (left.type === TokenType.Number && right.type === TokenType.Number) {
		if (left.val < right.val) return -1;
		if (left.val > right.val) return 1;
		return 0;
	}
	if (isString(left.val) && isString(right.val)) return stringTokenCmp(left.val, right.val);
	return right.type === TokenType.Number ? -1 : 1;
}
function compare(left, right) {
	const leftTokens = coerceArray(tokenize(left));
	const rightTokens = coerceArray(tokenize(right));
	const length = Math.max(leftTokens.length, rightTokens.length);
	for (let idx = 0; idx < length; idx += 1) {
		const cmpResult = tokenCmp(leftTokens[idx] || null, rightTokens[idx] || null);
		if (cmpResult !== 0) return cmpResult;
	}
	return 0;
}
function parse(input) {
	if (!input) return null;
	if (!regEx(/^[-._+a-zA-Z0-9]+$/i).test(input)) return null;
	if (regEx(/^latest\.?/i).test(input)) return null;
	const tokens = tokenize(input);
	// istanbul ignore if: should not happen
	if (!tokens?.length) return null;
	return tokens;
}
function isVersion(input) {
	return !!parse(input);
}
function parsePrefixRange(input) {
	if (!input) return null;
	if (input.trim() === "+") return { tokens: [] };
	if (regEx(/[^-._+][-._]\+$/).test(input)) {
		const tokens = tokenize(input.replace(regEx(/[-._]\+$/), ""));
		if (tokens) return { tokens };
	}
	return null;
}
const mavenBasedRangeRegex = regEx(/^(?<leftBoundStr>[[\](]\s*)(?<leftVal>[-._+a-zA-Z0-9]*?)(?<separator>\s*,\s*)(?<rightVal>[-._+a-zA-Z0-9]*?)(?<rightBoundStr>\s*[[\])])(?:!!(?<preferredVal>[-._+a-zA-Z0-9]+))?$/);
function parseMavenBasedRange(input) {
	if (!input) return null;
	const matchGroups = mavenBasedRangeRegex.exec(input)?.groups;
	if (!matchGroups) return null;
	const { leftBoundStr, separator, rightBoundStr } = matchGroups;
	const leftVal = matchGroups.leftVal || null;
	const rightVal = matchGroups.rightVal || null;
	const preferredVal = matchGroups.preferredVal || null;
	const isVersionLeft = isString(leftVal) && isVersion(leftVal);
	const isVersionRight = isString(rightVal) && isVersion(rightVal);
	if (leftVal !== null && !isVersionLeft || rightVal !== null && !isVersionRight) return null;
	if (isVersionLeft && isVersionRight && leftVal && rightVal && compare(leftVal, rightVal) === 1) return null;
	return {
		leftBound: leftBoundStr.trim() === "[" ? "inclusive" : "exclusive",
		leftBoundStr,
		leftVal,
		separator,
		rightBound: rightBoundStr.trim() === "]" ? "inclusive" : "exclusive",
		rightBoundStr,
		rightVal,
		preferredVal
	};
}
const singleVersionRangeRegex = regEx(/^\[\s*(?<val>[-._+a-zA-Z0-9]*?)\s*\]$/);
function parseSingleVersionRange(input) {
	const matchGroups = singleVersionRangeRegex.exec(input)?.groups;
	if (!matchGroups) return null;
	const { val } = matchGroups;
	if (!isVersion(val)) return null;
	return { val };
}
function isValid(str) {
	if (!str) return false;
	return isVersion(str) || !!parsePrefixRange(str) || !!parseMavenBasedRange(str) || !!parseSingleVersionRange(str);
}
//#endregion
export { QualifierRank, TokenType, compare, isValid, isVersion, parse, parseMavenBasedRange, parsePrefixRange, parseSingleVersionRange, qualifierRank, tokenize };

//# sourceMappingURL=compare.js.map