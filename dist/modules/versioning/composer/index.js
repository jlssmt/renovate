import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { api as api$1 } from "../npm/index.js";
import { isNumber } from "@sindresorhus/is";
import semver from "semver";
import { parseRange } from "semver-utils";
//#region lib/modules/versioning/composer/index.ts
const id = "composer";
function getVersionParts(input) {
	const versionParts = input.split("-");
	if (versionParts.length === 1) return [input, ""];
	return [versionParts[0], `-${versionParts[1]}`];
}
function padZeroes(input) {
	const [output, stability] = getVersionParts(input);
	const sections = output.split(".");
	while (sections.length < 3) sections.push("0");
	return `${sections.join(".")}${stability}`;
}
function convertStabilityModifier(input) {
	const versionParts = input.split("@");
	if (versionParts.length === 1) return input;
	const stability = versionParts[1].replace(regEx(/(?:^|\s)(?<label>beta|alpha|rc)(?<num>[1-9][0-9]*)(?: |$)/gi), "$<label>.$<num>");
	return `${padZeroes(versionParts[0])}-${stability}`;
}
function normalizeVersion(input) {
	let output = input;
	output = output.replace(regEx(/^\+/), "");
	output = output.replace(regEx(/(?<prefix>^|>|>=|\^|~)v/i), "$<prefix>");
	return convertStabilityModifier(output);
}
/**
* @param versions Version list in any format, it recognizes the specific patch format x.x.x-pXX
* @param range Range in composer format
* @param minMode If true, it will calculate minSatisfyingVersion, if false, it calculates the maxSatisfyingVersion
* @returns min or max satisfyingVersion from the input
*/
function calculateSatisfyingVersionIntenal(versions, range, minMode) {
	const versionsMapped = versions.map((x) => {
		return {
			origianl: x,
			cleaned: removeComposerSpecificPatchPart(x),
			npmVariant: composer2npm(removeComposerSpecificPatchPart(x)[0])
		};
	});
	const npmVersions = versionsMapped.map((x) => x.npmVariant);
	const npmVersion = minMode ? api$1.minSatisfyingVersion(npmVersions, composer2npm(range)) : api$1.getSatisfyingVersion(npmVersions, composer2npm(range));
	if (!npmVersion) return null;
	return versionsMapped.filter((x) => x.npmVariant === npmVersion).sort((a, b) => (minMode ? 1 : -1) * sortVersions(a.origianl, b.origianl))[0].origianl;
}
/**
* @param intput Version in any format, it recognizes the specific patch format x.x.x-pXX
* @returns If input contains the specific patch, it returns the input with removed the patch and true, otherwise it retunrs the same string and false.
*/
function removeComposerSpecificPatchPart(input) {
	const match = regEx(/^v?\d+(?:\.\d+(?:\.\d+(?:\.\d+)?)?)?(?<suffix>-p[1-9]\d*)$/gi).exec(input);
	return match ? [input.replace(match.groups.suffix, ""), true] : [input, false];
}
function composer2npm(input) {
	return input.split(regEx(/\s*\|\|?\s*/g)).map((part) => {
		const cleanInput = normalizeVersion(part);
		if (api$1.isVersion(cleanInput)) return cleanInput;
		if (api$1.isVersion(padZeroes(cleanInput))) return padZeroes(cleanInput);
		const [versionId, stability] = getVersionParts(cleanInput);
		let output = versionId;
		output = output.replace(regEx(/(?:^|\s)~(?<minVersion>[1-9][0-9]*(?:\.[0-9]*)?)(?: |$)/g), "^$<minVersion>");
		output = output.replace(regEx(/(?:^|\s)~(?<minVersion>0\.[1-9][0-9]*)(?: |$)/g), ">=$<minVersion> <1");
		output = output.replace(regEx(/^(?<version><\d+(?:\.\d+)?)$/g), "$<version>.0").replace(regEx(/^(?<version><\d+(?:\.\d+)?)$/g), "$<version>.0");
		return output + stability;
	}).map((part) => part.replace(regEx(/(?<letter>[a-z])(?<digit>[0-9])/gi), "$<letter>.$<digit>")).join(" || ");
}
function equals(a, b) {
	return api$1.equals(composer2npm(a), composer2npm(b));
}
function getMajor(version) {
	const semverVersion = semver.coerce(composer2npm(version));
	return semverVersion ? api$1.getMajor(semverVersion) : null;
}
function getMinor(version) {
	const semverVersion = semver.coerce(composer2npm(version));
	return semverVersion ? api$1.getMinor(semverVersion) : null;
}
function getPatch(version) {
	const semverVersion = semver.coerce(composer2npm(version));
	return semverVersion ? api$1.getPatch(semverVersion) : null;
}
function isGreaterThan(a, b) {
	return sortVersions(a, b) === 1;
}
function isLessThanRange(version, range) {
	return !!api$1.isLessThanRange?.(composer2npm(version), composer2npm(range));
}
function isSingleVersion(input) {
	return !!input && api$1.isSingleVersion(composer2npm(input));
}
function isStable(version) {
	if (version) {
		const [withoutPatch] = removeComposerSpecificPatchPart(version);
		return api$1.isStable(composer2npm(withoutPatch));
	}
	return false;
}
function isValid(input) {
	return !!input && api$1.isValid(composer2npm(input));
}
function isVersion(input) {
	return !!input && api$1.isVersion(composer2npm(input));
}
function matches(version, range) {
	return api$1.matches(composer2npm(version), composer2npm(range));
}
function getSatisfyingVersion(versions, range) {
	return calculateSatisfyingVersionIntenal(versions, range, false);
}
function minSatisfyingVersion(versions, range) {
	return calculateSatisfyingVersionIntenal(versions, range, true);
}
function subset(subRange, superRange) {
	try {
		return api$1.subset(composer2npm(subRange), composer2npm(superRange));
	} catch (err) {
		logger.trace({ err }, "composer.subset error");
		return false;
	}
}
function intersects(subRange, superRange) {
	try {
		return api$1.intersects(composer2npm(subRange), composer2npm(superRange));
	} catch (err) {
		logger.trace({ err }, "composer.intersects error");
		return false;
	}
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	if (rangeStrategy === "update-lockfile") {
		if (matches(newVersion, currentValue)) return currentValue;
		return getNewValue({
			currentValue,
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
	}
	const currentMajor = currentVersion ? getMajor(currentVersion) : null;
	const toMajor = getMajor(newVersion);
	const toMinor = getMinor(newVersion);
	let newValue = null;
	if (isVersion(currentValue)) newValue = newVersion;
	else if (regEx(/^[~^](?:0\.[1-9][0-9]*)$/).test(currentValue)) {
		const operator = currentValue.at(0);
		if (toMajor === 0) newValue = `${operator}0.${toMinor}`;
		else newValue = `${operator}${toMajor}.0`;
	} else if (regEx(/^[~^](?:[0-9]*)$/).test(currentValue)) newValue = `${currentValue.at(0)}${toMajor}`;
	else if (toMajor && regEx(/^[~^](?:[0-9]*(?:\.[0-9]*)?)$/).test(currentValue)) {
		const operator = currentValue.at(0);
		if (rangeStrategy === "bump") newValue = `${operator}${newVersion}`;
		else if (isNumber(currentMajor) && toMajor > currentMajor || !toMinor) newValue = `${operator}${toMajor}.0`;
		else newValue = `${operator}${toMajor}.${toMinor}`;
	} else if (currentVersion && api$1.isVersion(padZeroes(normalizeVersion(newVersion))) && api$1.isValid(normalizeVersion(currentValue)) && composer2npm(currentValue) === normalizeVersion(currentValue)) newValue = api$1.getNewValue({
		currentValue: normalizeVersion(currentValue),
		rangeStrategy,
		currentVersion: padZeroes(normalizeVersion(currentVersion)),
		newVersion: padZeroes(normalizeVersion(newVersion))
	});
	if (rangeStrategy === "widen" && matches(newVersion, currentValue)) newValue = currentValue;
	else if (currentValue.includes(" || ") || rangeStrategy === "widen") {
		const replacementValue = getNewValue({
			currentValue: currentValue.split("||").at(-1).trim(),
			rangeStrategy: "replace",
			currentVersion,
			newVersion
		});
		if (rangeStrategy === "replace") newValue = replacementValue;
		else {
			const element = parseRange(replacementValue).at(-1);
			if (element.operator?.startsWith("<")) {
				const splitCurrent = currentValue.split(element.operator);
				splitCurrent.pop();
				newValue = `${splitCurrent.join(element.operator)}${replacementValue}`;
			} else newValue = `${currentValue} || ${replacementValue}`;
		}
	}
	if (!newValue) {
		logger.warn({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion
		}, "Unsupported composer value");
		newValue = newVersion;
	}
	if (currentValue.split(".")[0].includes("v")) newValue = newValue.replace(regEx(/(?<digit>[0-9])/), "v$<digit>");
	if (currentValue.includes("@")) newValue += `@${currentValue.split("@")[1]}`;
	return newValue;
}
function sortVersions(a, b) {
	const [aWithoutPatch, aContainsPatch] = removeComposerSpecificPatchPart(a);
	const [bWithoutPatch, bContainsPatch] = removeComposerSpecificPatchPart(b);
	if (aContainsPatch === bContainsPatch) return api$1.sortVersions(composer2npm(a), composer2npm(b));
	if (api$1.equals(composer2npm(aWithoutPatch), composer2npm(bWithoutPatch))) return aContainsPatch ? 1 : -1;
	return api$1.sortVersions(composer2npm(a), composer2npm(b));
}
function isCompatible(version) {
	return isVersion(version);
}
function isBreaking(current, version) {
	return api$1.isBreaking(composer2npm(current), composer2npm(version));
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	isBreaking,
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
	sortVersions,
	subset,
	intersects
};
//#endregion
export { api, api as default, id, isValid, isVersion };

//# sourceMappingURL=index.js.map