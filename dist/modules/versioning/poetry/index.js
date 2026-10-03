import { logger } from "../../../logger/index.js";
import { api as api$1 } from "../npm/index.js";
import { api as api$2 } from "../pep440/index.js";
import { VERSION_PATTERN } from "./patterns.js";
import { npm2poetry, poetry2npm, poetry2semver, semver2poetry } from "./transform.js";
import { parseRange } from "semver-utils";
//#region lib/modules/versioning/poetry/index.ts
const id = "poetry";
function equals(a, b) {
	const semverA = poetry2semver(a);
	const semverB = poetry2semver(b);
	return !!(semverA && semverB && api$1.equals(semverA, semverB));
}
function getMajor(version) {
	const semverVersion = poetry2semver(version);
	return semverVersion ? api$1.getMajor(semverVersion) : null;
}
function getMinor(version) {
	const semverVersion = poetry2semver(version);
	return semverVersion ? api$1.getMinor(semverVersion) : null;
}
function getPatch(version) {
	const semverVersion = poetry2semver(version);
	return semverVersion ? api$1.getPatch(semverVersion) : null;
}
function isVersion(input) {
	return VERSION_PATTERN.test(input);
}
function isGreaterThan(a, b) {
	return !!(a && b && api$2.isGreaterThan(a, b));
}
function isLessThanRange(version, range) {
	const semverVersion = poetry2semver(version);
	return !!(isVersion(version) && semverVersion && api$1.isLessThanRange?.(semverVersion, poetry2npm(range)));
}
function isValid(input) {
	if (!input) return false;
	try {
		return api$1.isValid(poetry2npm(input, true));
	} catch {
		logger.once.debug({ version: input }, "Poetry version or range is not supported by current implementation");
		return false;
	}
}
function isStable(version) {
	const semverVersion = poetry2semver(version);
	return !!(semverVersion && api$1.isStable(semverVersion));
}
function matches(version, range) {
	const semverVersion = poetry2semver(version);
	return !!(isVersion(version) && semverVersion && api$1.matches(semverVersion, poetry2npm(range)));
}
function getSatisfyingVersion(versions, range) {
	const semverVersions = [];
	versions.forEach((version) => {
		const semverVersion = poetry2semver(version);
		if (semverVersion) semverVersions.push(semverVersion);
	});
	const npmRange = poetry2npm(range);
	const satisfyingVersion = api$1.getSatisfyingVersion(semverVersions, npmRange);
	return satisfyingVersion ? semver2poetry(satisfyingVersion) : null;
}
function minSatisfyingVersion(versions, range) {
	const semverVersions = [];
	versions.forEach((version) => {
		const semverVersion = poetry2semver(version);
		if (semverVersion) semverVersions.push(semverVersion);
	});
	const npmRange = poetry2npm(range);
	const satisfyingVersion = api$1.minSatisfyingVersion(semverVersions, npmRange);
	return satisfyingVersion ? semver2poetry(satisfyingVersion) : null;
}
function isSingleVersion(constraint) {
	return constraint.trim().startsWith("=") && isVersion(constraint.trim().substring(1).trim()) || isVersion(constraint.trim());
}
function handleShort(operator, currentValue, newVersion) {
	const toVersionMajor = getMajor(newVersion);
	const toVersionMinor = getMinor(newVersion);
	const split = currentValue.split(".");
	if (toVersionMajor !== null && split.length === 1) return `${operator}${toVersionMajor}`;
	if (toVersionMajor !== null && toVersionMinor !== null && split.length === 2) return `${operator}${toVersionMajor}.${toVersionMinor}`;
	return null;
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	if (rangeStrategy === "replace") {
		const npmCurrentValue = poetry2npm(currentValue);
		try {
			const massagedNewVersion = poetry2semver(newVersion);
			if (massagedNewVersion && isVersion(massagedNewVersion) && api$1.matches(massagedNewVersion, npmCurrentValue)) return currentValue;
		} catch (err) /* istanbul ignore next */ {
			logger.info({ err }, "Poetry versioning: Error caught checking if newVersion satisfies currentValue");
		}
		const parsedRange = parseRange(npmCurrentValue);
		const element = parsedRange.at(-1);
		if (parsedRange.length === 1 && element.operator) {
			if (element.operator === "^") {
				const version = handleShort("^", npmCurrentValue, newVersion);
				if (version) return npm2poetry(version);
			}
			if (element.operator === "~") {
				const version = handleShort("~", npmCurrentValue, newVersion);
				if (version) return npm2poetry(version);
			}
		}
	}
	if ((VERSION_PATTERN.exec(newVersion)?.groups?.release ?? "").split(".").length !== 3) {
		logger.debug("Cannot massage python version to npm - returning currentValue");
		return currentValue;
	}
	try {
		const currentSemverVersion = currentVersion && poetry2semver(currentVersion);
		const newSemverVersion = poetry2semver(newVersion);
		if (currentSemverVersion && newSemverVersion) {
			const newSemver = api$1.getNewValue({
				currentValue: poetry2npm(currentValue),
				rangeStrategy,
				currentVersion: currentSemverVersion,
				newVersion: newSemverVersion
			});
			const newPoetry = newSemver && npm2poetry(newSemver);
			if (newPoetry) return newPoetry;
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion,
			err
		}, "Could not generate new value using npm.getNewValue()");
	}
	// istanbul ignore next
	return currentValue;
}
function sortVersions(a, b) {
	return api$2.sortVersions(a, b);
}
function subset(subRange, superRange) {
	return api$1.subset(poetry2npm(subRange), poetry2npm(superRange));
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	getNewValue,
	getSatisfyingVersion,
	isCompatible: isVersion,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	minSatisfyingVersion,
	sortVersions,
	subset
};
//#endregion
export { api, api as default, id, isValid };

//# sourceMappingURL=index.js.map