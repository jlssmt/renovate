import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isSemVerXRange, normalizeLegacyXRanges } from "../semver/common.js";
import { isString } from "@sindresorhus/is";
import semver from "semver";
import semverUtils from "semver-utils";
//#region lib/modules/versioning/npm/range.ts
const { inc: increment, valid: isVersion, major: major$1, minor: minor$1, patch, prerelease, satisfies: satisfies$1 } = semver;
function replaceCaretValue(oldValue, newValue) {
	const toVersionMajor = major$1(newValue);
	const toVersionMinor = minor$1(newValue);
	const toVersionPatch = patch(newValue);
	const oldTuple = [
		major$1(oldValue),
		minor$1(oldValue),
		patch(oldValue)
	];
	const newTuple = [
		toVersionMajor,
		toVersionMinor,
		toVersionPatch
	];
	const resultTuple = [];
	let leadingZero = true;
	let needReplace = false;
	for (let idx = 0; idx < 3; idx += 1) {
		const oldVal = oldTuple[idx];
		const newVal = newTuple[idx];
		let leadingDigit = false;
		if ((oldVal !== 0 || newVal !== 0) && leadingZero) {
			leadingZero = false;
			leadingDigit = true;
		}
		if (leadingDigit && newVal > oldVal) needReplace = true;
		if (!needReplace && newVal < oldVal) return newValue;
		resultTuple.push(leadingDigit ? newVal : 0);
	}
	return needReplace ? resultTuple.join(".") : oldValue;
}
function stripV(value) {
	return value.replace(regEx(/^v/), "");
}
function satisfiesRange(version, range) {
	return satisfies$1(version, normalizeLegacyXRanges(range));
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	if (rangeStrategy !== "update-lockfile" && isSemVerXRange(currentValue)) return null;
	if (isVersion(currentValue)) return newVersion;
	if (rangeStrategy === "update-lockfile") {
		if (satisfiesRange(newVersion, currentValue)) return currentValue;
		return getNewValue({
			currentValue,
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
	}
	const parsedRange = semverUtils.parseRange(currentValue);
	const element = parsedRange.at(-1);
	if (rangeStrategy === "widen") {
		if (satisfiesRange(newVersion, currentValue)) return currentValue;
		const newValue = getNewValue({
			currentValue,
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
		if (element.operator?.startsWith("<")) {
			const splitCurrent = currentValue.split(element.operator);
			splitCurrent.pop();
			return `${splitCurrent.join(element.operator)}${newValue}`;
		}
		if (parsedRange.length > 1) {
			if (parsedRange.at(-2).operator === "-") {
				const splitCurrent = currentValue.split("-");
				splitCurrent.pop();
				return `${splitCurrent.join("-")}- ${newValue}`;
			}
			if (element.operator?.startsWith(">")) {
				logger.warn(`Complex ranges ending in greater than are not supported`);
				return null;
			}
		}
		return `${currentValue} || ${newValue}`;
	}
	const toVersionMajor = major$1(newVersion);
	const toVersionMinor = minor$1(newVersion);
	const toVersionPatch = patch(newVersion);
	const toNewVersion = prerelease(newVersion);
	const suffix = toNewVersion ? `-${toNewVersion[0]}` : "";
	if (rangeStrategy === "bump") {
		if (parsedRange.length === 1) {
			if (!element.operator) return stripV(newVersion);
			if (element.operator === "^") return `^${stripV(newVersion)}`;
			if (element.operator === "~") return `~${stripV(newVersion)}`;
			if (element.operator === "=") return `=${stripV(newVersion)}`;
			if (element.operator === ">=") return currentValue.includes(">= ") ? `>= ${stripV(newVersion)}` : `>=${stripV(newVersion)}`;
			if (element.operator.startsWith("<")) return currentValue;
		} else return semverUtils.parseRange(currentValue).map((x) => x.semver).filter(isString).map((subRange) => {
			const bumpedSubRange = getNewValue({
				currentValue: subRange,
				rangeStrategy: "bump",
				currentVersion,
				newVersion
			});
			if (bumpedSubRange && satisfiesRange(newVersion, bumpedSubRange)) return bumpedSubRange;
			return getNewValue({
				currentValue: subRange,
				rangeStrategy: "replace",
				currentVersion,
				newVersion
			});
		}).filter((x) => x !== null && x !== "").join(" ");
		logger.debug(`Unsupported range type for rangeStrategy=bump: ${currentValue}`);
		return null;
	}
	if (element.operator === "~>") return `~> ${toVersionMajor}.${toVersionMinor}.0`;
	if (element.operator === "^") {
		if (suffix.length || !currentVersion) return `^${toVersionMajor}.${toVersionMinor}.${toVersionPatch}${suffix}`;
		return `^${replaceCaretValue(currentVersion, newVersion)}`;
	}
	if (element.operator === "=") return `=${stripV(newVersion)}`;
	if (element.operator === "~") {
		if (suffix.length) return `~${toVersionMajor}.${toVersionMinor}.${toVersionPatch}${suffix}`;
		return `~${toVersionMajor}.${toVersionMinor}.0`;
	}
	if (element.operator === "<=") {
		let res;
		if (!!element.patch || suffix.length) res = `<=${stripV(newVersion)}`;
		else if (element.minor) res = `<=${toVersionMajor}.${toVersionMinor}`;
		else res = `<=${toVersionMajor}`;
		if (currentValue.includes("<= ")) res = res.replace("<=", "<= ");
		return res;
	}
	if (element.operator === "<") {
		let res;
		if (currentValue.endsWith(".0.0")) res = `<${toVersionMajor + 1}.0.0`;
		else if (currentValue.endsWith(".0")) res = `<${toVersionMajor}.${toVersionMinor + 1}${element.patch ? ".0" : ""}`;
		else if (element.patch) res = `<${increment(newVersion, "patch")}`;
		else if (element.minor) res = `<${toVersionMajor}.${toVersionMinor + 1}`;
		else res = `<${toVersionMajor + 1}`;
		if (currentValue.includes("< ")) res = res.replace(regEx(/</g), "< ");
		return res;
	}
	if (!element.operator) {
		if (element.minor) {
			if (element.minor === "x") return `${toVersionMajor}.x`;
			if (element.minor === "*") return `${toVersionMajor}.*`;
			if (element.patch === "x") return `${toVersionMajor}.${toVersionMinor}.x`;
			if (element.patch === "*") return `${toVersionMajor}.${toVersionMinor}.*`;
			return `${toVersionMajor}.${toVersionMinor}`;
		}
		return `${toVersionMajor}`;
	}
	return newVersion;
}
//#endregion
export { getNewValue };

//# sourceMappingURL=range.js.map