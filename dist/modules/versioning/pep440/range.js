import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { isTruthy } from "@sindresorhus/is";
import { gte, lt, lte, satisfies } from "@renovatebot/pep440";
import { parse } from "@renovatebot/pep440/lib/specifier.js";
import { parse as parse$1 } from "@renovatebot/pep440/lib/version.js";
//#region lib/modules/versioning/pep440/range.ts
const UserPolicyPrecisionMap = {
	Major: 0,
	Minor: 1,
	Micro: 2,
	Bug: 3,
	None: Infinity
};
const PrecisionUserPolicyMap = {
	0: "Major",
	1: "Minor",
	2: "Micro",
	3: "Bug"
};
/**
* Calculate current update range precision.
* @param ranges A {@link Range} consists of current range
* @returns A {@link UserPolicy}
*/
function getRangePrecision(ranges) {
	const bound = coerceArray(parse$1((ranges[1] || ranges[0]).version)?.release);
	let rangePrecision = -1;
	if (ranges.length === 1) rangePrecision = bound.length - 1;
	if (ranges.length === 2) {
		const lowerBound = coerceArray(parse$1(ranges[0].version)?.release);
		rangePrecision = bound.findIndex((el, index) => el > lowerBound[index]);
	}
	if (rangePrecision === UserPolicyPrecisionMap.Major && rangePrecision + 1 < bound.length && bound[rangePrecision + 1] === 0) rangePrecision++;
	// istanbul ignore next
	if (rangePrecision === -1) rangePrecision = bound.length - 1;
	const key = PrecisionUserPolicyMap[rangePrecision];
	return UserPolicyPrecisionMap[key];
}
/**
* @param policy Required range precision
* @param newVersion The newly accepted version
* @param baseVersion Optional Current upper bound
* @returns A string represents a future version upper bound.
*/
function getFutureVersion(policy, newVersion, baseVersion) {
	const toRelease = coerceArray(parse$1(newVersion)?.release);
	return coerceArray(parse$1(baseVersion ?? newVersion)?.release).map((_, index) => {
		const toPart = toRelease[index] ?? 0;
		if (index < policy) return toPart;
		if (index === policy) return toPart + (baseVersion === void 0 ? 0 : 1);
		return 0;
	});
}
function getPinnedValue(newVersion) {
	return `==${newVersion}`;
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion, isReplacement }) {
	let ranges;
	let updatedRange;
	if (currentValue === currentVersion || isReplacement) return newVersion;
	if (parse$1(currentValue)) {
		const vPrefix = regEx(/^(?<prefix>[vV])/).exec(currentValue);
		if (vPrefix) return `${vPrefix.groups.prefix}${newVersion}`;
		return newVersion;
	}
	try {
		ranges = parseCurrentRange(currentValue);
		if (!ranges.length) {
			logger.warn({ currentValue }, "Empty currentValue");
			return currentValue;
		}
	} catch (err) {
		logger.warn({
			currentValue,
			err
		}, "Unexpected range error");
		return null;
	}
	if (ranges.some((range) => range.operator === "!=" && range.version === newVersion)) {
		logger.debug(`Cannot calculate new value as the newVersion:\`${newVersion}\` is excluded from range: \`${currentValue}\``);
		return null;
	}
	switch (rangeStrategy) {
		case "auto":
		case "replace":
			updatedRange = handleReplaceStrategy({
				currentValue,
				rangeStrategy,
				currentVersion,
				newVersion
			}, ranges);
			break;
		case "widen":
			updatedRange = handleWidenStrategy({
				currentValue,
				rangeStrategy,
				currentVersion,
				newVersion
			}, ranges);
			break;
		case "bump":
			updatedRange = handleBumpStrategy({
				currentValue,
				rangeStrategy,
				currentVersion,
				newVersion
			}, ranges);
			break;
		default:
			logger.debug(`Unsupported rangeStrategy: ${rangeStrategy}. Using "replace" instead.`);
			return getNewValue({
				currentValue,
				rangeStrategy: "replace",
				currentVersion,
				newVersion
			});
	}
	let result = updatedRange.filter(isTruthy).join(", ");
	if (result.includes(", ") && !currentValue.includes(", ")) result = result.replace(regEx(/, /g), ",");
	const checkedResult = checkRangeAndRemoveUnnecessaryRangeLimit(result, newVersion);
	// istanbul ignore if
	if (!satisfies(newVersion, checkedResult)) {
		logger.warn({
			result,
			newVersion,
			currentValue
		}, "pep440: failed to calculate newValue");
		return null;
	}
	return checkedResult;
}
function isLessThanRange(input, range) {
	try {
		let invertResult = true;
		const result = range.split(",").map((x) => x.replace(regEx(/\s*/g), "").split(regEx(/(?<op>~=|==|!=|<=|>=|<|>|===)/)).slice(1)).map(([op, version]) => {
			if ([
				"!=",
				"<=",
				"<"
			].includes(op)) return true;
			invertResult = false;
			if ([
				"~=",
				"==",
				">=",
				"==="
			].includes(op)) return lt(input, version);
			return lte(input, version);
		}).every((res) => res === true);
		return invertResult ? !result : result;
	} catch /* istanbul ignore next */ {
		return false;
	}
}
function parseCurrentRange(currentValue) {
	const ranges = parse(currentValue);
	if (!ranges) throw new TypeError("Invalid pep440 currentValue");
	if (ranges.some((range) => range.operator === "===")) throw new TypeError("PEP440 arbitrary equality (===) not supported");
	return ranges;
}
function handleLowerBound(range, newVersion) {
	if (lte(newVersion, range.version)) return `>=${newVersion}`;
	return `${range.operator}${range.version}`;
}
function handleUpperBound(range, newVersion) {
	if (range.operator === "<") {
		if (gte(newVersion, range.version)) {
			const futureVersion = getFutureVersion(getRangePrecision([range]), newVersion, range.version);
			return range.operator + futureVersion.join(".");
		}
		return range.operator + range.version;
	}
	// istanbul ignore next
	return null;
}
function updateRangeValue({ currentValue, newVersion }, range) {
	if (range.operator === "!=") return range.operator + range.version;
	if (range.prefix) {
		const futureVersion = getFutureVersion(UserPolicyPrecisionMap.None, newVersion, range.version).join(".");
		return `${range.operator}${futureVersion}.*`;
	}
	if (range.operator === "~=") {
		const baseVersion = coerceArray(parse$1(range.version)?.release);
		const futureVersion = coerceArray(parse$1(newVersion)?.release);
		const baseLen = baseVersion.length;
		const newVerLen = futureVersion.length;
		if (baseLen < newVerLen) return range.operator + futureVersion.slice(0, baseVersion.length).join(".");
		if (baseLen > newVerLen) {
			for (let i = baseLen - newVerLen - 1; i >= 0; i--) futureVersion.push(0);
			return range.operator + futureVersion.join(".");
		}
		return range.operator + newVersion;
	}
	if (["==", "<="].includes(range.operator)) {
		if (lte(newVersion, range.version)) return range.operator + range.version;
		return range.operator + newVersion;
	}
	const output = handleUpperBound(range, newVersion);
	if (output) return output;
	return handleLowerBound(range, newVersion);
}
/**
* Checks for zero specifiers.
* returns true if one of the bounds' length is < 3.
* @param ranges A {@link Range} array.
* @returns A boolean value
* Used mainly for cosmetics for the rez versioning syntax.
*/
function hasZeroSpecifier(ranges) {
	return ranges.some((range) => {
		const release = parse$1(range.version)?.release;
		return release && release.length < 3;
	});
}
function trimTrailingZeros(numbers) {
	let i = numbers.length - 1;
	while (numbers[i] === 0) i--;
	return numbers.slice(0, i + 1);
}
function divideCompatibleReleaseRange(currentRange) {
	const currentVersionUpperBound = currentRange.version.split(".").map((num) => parseInt(num, 10));
	currentVersionUpperBound.splice(-1);
	currentVersionUpperBound[currentVersionUpperBound.length - 1] += 1;
	return [{
		operator: ">=",
		version: currentRange.version
	}, {
		operator: "<",
		version: currentVersionUpperBound.join(".")
	}];
}
function handleWidenStrategy({ currentValue, rangeStrategy, currentVersion, newVersion }, ranges) {
	if (satisfies(newVersion, currentValue)) return [currentValue];
	let rangePrecision = getRangePrecision(ranges);
	const trimZeros = hasZeroSpecifier(ranges);
	let newRanges = [];
	if (ranges.length === 1 && ranges[0].operator === "~=") newRanges = divideCompatibleReleaseRange(ranges[0]);
	else newRanges = ranges;
	return newRanges.map((range) => {
		if (range.operator === "<" && gte(newVersion, range.version)) {
			const upperBound = coerceArray(parse$1(range.version)?.release);
			const len = upperBound.length;
			if (upperBound[len - 1] !== 0) {
				const key = PrecisionUserPolicyMap[len - 1];
				rangePrecision = UserPolicyPrecisionMap[key];
			}
			let futureVersion = getFutureVersion(rangePrecision, newVersion, range.version);
			if (trimZeros) futureVersion = trimTrailingZeros(futureVersion);
			return range.operator + futureVersion.join(".");
		}
		return updateRangeValue({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion
		}, range);
	});
}
function handleReplaceStrategy({ currentValue, rangeStrategy, currentVersion, newVersion }, ranges) {
	if (satisfies(newVersion, currentValue)) return [currentValue];
	const trimZeros = hasZeroSpecifier(ranges);
	return ranges.map((range) => {
		if (range.operator === "<" && gte(newVersion, range.version)) {
			let futureVersion = getFutureVersion(getRangePrecision(ranges), newVersion, range.version);
			if (trimZeros) futureVersion = trimTrailingZeros(futureVersion);
			return range.operator + futureVersion.join(".");
		}
		if ([">", ">="].includes(range.operator)) {
			if (lte(newVersion, range.version)) return `>=${newVersion}`;
			let newBase = getFutureVersion(coerceArray(parse$1(range.version)?.release).length - 1, newVersion);
			if (trimZeros) newBase = trimTrailingZeros(newBase);
			if (range.operator === ">" && newVersion === newBase.join(".") && newBase.length > 1) newBase.pop();
			return range.operator + newBase.join(".");
		}
		return updateRangeValue({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion
		}, range);
	});
}
function handleBumpStrategy({ currentValue, rangeStrategy, currentVersion, newVersion }, ranges) {
	return ranges.map((range) => {
		if (range.operator === ">=") return range.operator + newVersion;
		return updateRangeValue({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion
		}, range);
	});
}
function checkRangeAndRemoveUnnecessaryRangeLimit(rangeInput, newVersion) {
	let newRange = rangeInput;
	if (rangeInput.includes(",")) {
		const newRes = rangeInput.split(",");
		if (newRes[0].includes(".*") && newRes[0].includes("==") && newRes[1].includes(">=") && satisfies(newVersion, newRes[0])) newRange = newRes[0];
	} else return rangeInput;
	return newRange;
}
//#endregion
export { checkRangeAndRemoveUnnecessaryRangeLimit, getNewValue, getPinnedValue, isLessThanRange };

//# sourceMappingURL=range.js.map