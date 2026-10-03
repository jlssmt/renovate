import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { cleanVersion, containsOperators, getOptions, makeVersion, matchesWithOptions } from "./common.js";
import { isString } from "@sindresorhus/is";
import * as semver$1 from "semver";
import { parseRange } from "semver-utils";
//#region lib/modules/versioning/conan/range.ts
function getMajor(version) {
	const cleanedVersion = cleanVersion(version);
	const options = getOptions(version);
	options.includePrerelease = true;
	const cleanerVersion = makeVersion(cleanedVersion, options);
	if (isString(cleanerVersion)) return parseInt(cleanerVersion.split(".")[0], 10);
	return null;
}
function getMinor(version) {
	const cleanedVersion = cleanVersion(version);
	const options = getOptions(version);
	options.includePrerelease = true;
	const cleanerVersion = makeVersion(cleanedVersion, options);
	if (isString(cleanerVersion)) return parseInt(cleanerVersion.split(".")[1], 10);
	return null;
}
function getPatch(version) {
	const cleanedVersion = cleanVersion(version);
	const options = getOptions(version);
	options.includePrerelease = true;
	const cleanerVersion = makeVersion(cleanedVersion, options);
	if (isString(cleanerVersion)) {
		const newVersion = semver$1.valid(semver$1.coerce(cleanedVersion, { loose: false }), options);
		/* v8 ignore next -- newVersion always has a patch segment once cleanerVersion is a valid, coercible semver string */
		return parseInt(coerceString(newVersion).split(".")[2] ?? "", 10);
	}
	return null;
}
function fixParsedRange(range) {
	const ordValues = [];
	const originalSplit = range.split(" ");
	for (let i = 0; i < originalSplit.length; i += 1) if (!containsOperators(originalSplit[i]) && !originalSplit[i].includes("||")) {
		if (i !== 0 && originalSplit[i - 1].includes("||")) ordValues.push(`|| ${originalSplit[i]}`);
		else if (i !== originalSplit.length && originalSplit[i + 1] === "||") ordValues.push(`${originalSplit[i]} ||`);
	} else ordValues.push(originalSplit[i]);
	const parsedRange = parseRange(range);
	const splitRange = range.replace(regEx(/(?:[<=>^~])(?: )?/g), "").split(" ");
	const semverRange = [];
	for (let i = 0; i < splitRange.length; i += 1) if (!splitRange[i].includes("||")) {
		const splitVersion = splitRange[i].split(".");
		const major = splitVersion[0];
		const minor = splitVersion[1];
		const patch = splitVersion[2];
		const operator = ordValues[i].includes("||") ? "||" : parsedRange[i].operator;
		const NewSemVer = { major };
		let full = `${coerceString(operator)}${major}`;
		if (minor) {
			NewSemVer.minor = minor;
			full = `${full}.${minor}`;
			if (patch) {
				NewSemVer.patch = patch;
				full = `${full}.${patch}`;
			}
		}
		/* v8 ignore next -- a segment with no operator is only reachable when adjacent to `||`, which always makes `operator` truthy (`'||'`) above; any other bare segment throws earlier at ordValues[i] */
		if (operator) {
			NewSemVer.operator = operator;
			full = range.includes(`${operator} `) ? `${operator} ${full.replace(operator, "")}` : `${operator}${full.replace(operator, "")}`;
		}
		full = ordValues[i].includes("||") ? ordValues[i] : full;
		NewSemVer.semver = full;
		semverRange.push(NewSemVer);
	}
	return semverRange;
}
function replaceRange({ currentValue, newVersion }) {
	const element = parseRange(currentValue).at(-1);
	const toVersionMajor = getMajor(newVersion);
	const toVersionMinor = getMinor(newVersion);
	const toVersionPatch = getPatch(newVersion);
	const suffix = semver$1.prerelease(newVersion) ? `-${String(semver$1.prerelease(newVersion)?.[0])}` : "";
	if (element.operator === "~>") return `~> ${toVersionMajor}.${toVersionMinor}.0`;
	if (element.operator === "=") return `=${newVersion}`;
	if (element.operator === "~") {
		if (suffix.length) return `~${toVersionMajor}.${toVersionMinor}.${toVersionPatch}${suffix}`;
		return `~${toVersionMajor}.${toVersionMinor}.0`;
	}
	if (element.operator === "<=") {
		let res;
		if (!!element.patch || suffix.length) res = `<=${newVersion}`;
		else if (element.minor) res = `<=${toVersionMajor}.${toVersionMinor}`;
		else res = `<=${toVersionMajor}`;
		if (currentValue.includes("<= ")) res = res.replace("<=", "<= ");
		return res;
	}
	if (element.operator === "<" && toVersionMajor) {
		let res;
		if (currentValue.endsWith(".0.0")) res = `<${toVersionMajor + 1}.0.0`;
		else if (element.patch) res = `<${semver$1.inc(newVersion, "patch")}`;
		else if (element.minor && toVersionMinor) res = `<${toVersionMajor}.${toVersionMinor + 1}`;
		else res = `<${toVersionMajor + 1}`;
		if (currentValue.includes("< ")) res = res.replace(regEx(/</g), "< ");
		return res;
	}
	if (element.operator === ">") {
		let res;
		if (currentValue.endsWith(".0.0") && toVersionMajor) res = `>${toVersionMajor + 1}.0.0`;
		else if (element.patch) res = `>${toVersionMajor}.${toVersionMinor}.${toVersionPatch}`;
		else if (element.minor) res = `>${toVersionMajor}.${toVersionMinor}`;
		else res = `>${toVersionMajor}`;
		if (currentValue.includes("> ")) res = res.replace(regEx(/</g), "> ");
		return res;
	}
	if (!element.operator) {
		if (element.minor) {
			if (element.minor === "x") return `${toVersionMajor}.x`;
			if (element.minor === "*") return `${toVersionMajor}.*`;
			if (element.patch === "x") return `${toVersionMajor}.${toVersionMinor}.x`;
			if (element.patch === "*") return `${toVersionMajor}.${toVersionMinor}.*`;
			return `${newVersion}`;
		}
		return `${toVersionMajor}`;
	}
	return newVersion;
}
function widenRange({ currentValue, currentVersion, newVersion }, options) {
	const parsedRange = parseRange(currentValue);
	const element = parsedRange.at(-1);
	if (matchesWithOptions(newVersion, currentValue, options)) return currentValue;
	const newValue = replaceRange({
		currentValue,
		rangeStrategy: "replace",
		currentVersion,
		newVersion
	});
	if (element.operator?.startsWith("<")) {
		const splitCurrent = currentValue.split(element.operator);
		splitCurrent.pop();
		return splitCurrent.join(element.operator) + newValue;
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
function bumpRange({ currentValue, currentVersion, newVersion }, options) {
	if (!containsOperators(currentValue) && currentValue.includes("||")) return widenRange({
		currentValue,
		rangeStrategy: "widen",
		currentVersion,
		newVersion
	}, options);
	const parsedRange = parseRange(currentValue);
	const element = parsedRange.at(-1);
	const toVersionMajor = getMajor(newVersion);
	const toVersionMinor = getMinor(newVersion);
	const suffix = semver$1.prerelease(newVersion) ? `-${String(semver$1.prerelease(newVersion)?.[0])}` : "";
	if (parsedRange.length === 1) {
		if (!element.operator) return replaceRange({
			currentValue,
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
		if (element.operator.startsWith("~")) {
			const split = currentValue.split(".");
			if (suffix.length) return `${element.operator}${newVersion}`;
			if (split.length === 1) return `${element.operator}${toVersionMajor}`;
			if (split.length === 2) return `${element.operator}${toVersionMajor}.${toVersionMinor}`;
			return `${element.operator}${newVersion}`;
		}
		if (element.operator === "=") return `=${newVersion}`;
		if (element.operator === ">=") return currentValue.includes(">= ") ? `>= ${newVersion}` : `>=${newVersion}`;
		if (element.operator.startsWith("<")) return currentValue;
	} else return fixParsedRange(currentValue).map((x) => {
		if (x.operator === "||") return x.semver;
		/* v8 ignore next -- fixParsedRange only ever produces elements with `operator === '||'` (handled above) or a real comparator operator; a falsy, non-`||` operator would have already thrown inside fixParsedRange */
		if (x.operator) {
			const bumpedSubRange = bumpRange({
				currentValue: x.semver,
				rangeStrategy: "bump",
				currentVersion,
				newVersion
			}, options);
			if (bumpedSubRange && matchesWithOptions(newVersion, bumpedSubRange, options)) return bumpedSubRange;
		}
		return replaceRange({
			currentValue: x.semver,
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
	}).filter((x) => x !== null && x !== "").join(" ");
	logger.debug(`Unsupported range type for rangeStrategy=bump: ${currentValue}`);
	return null;
}
//#endregion
export { bumpRange, fixParsedRange, getMajor, getMinor, getPatch, replaceRange, widenRange };

//# sourceMappingURL=range.js.map