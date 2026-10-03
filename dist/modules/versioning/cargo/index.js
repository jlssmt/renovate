import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { api as api$1 } from "../npm/index.js";
import { major, minor } from "semver";
import stable from "semver-stable";
//#region lib/modules/versioning/cargo/index.ts
const id = "cargo";
function isVersion(input) {
	return api$1.isVersion(input);
}
function convertToCaret(item) {
	if (isVersion(item) || isVersion(`${item}.0`) || isVersion(`${item}.0.0`)) return `^${item.trim()}`;
	return item.trim();
}
function cargo2npm(input) {
	let versions = input.split(",");
	versions = versions.map(convertToCaret);
	return versions.join(" ");
}
function notEmpty(s) {
	return s !== "";
}
function npm2cargo(input) {
	// istanbul ignore if
	if (!input) return input;
	const res = input.split(regEx(/\s+,?\s*|\s*,?\s+/)).map((str) => str.trim()).filter(notEmpty);
	const operators = [
		"^",
		"~",
		"=",
		">",
		"<",
		"<=",
		">="
	];
	for (let i = 0; i < res.length - 1; i += 1) if (operators.includes(res[i])) {
		const newValue = `${res[i]} ${res[i + 1]}`;
		res.splice(i, 2, newValue);
	}
	return res.join(", ");
}
function isLessThanRange(version, range) {
	return !!api$1.isLessThanRange?.(version, cargo2npm(range));
}
function isValid(input) {
	return api$1.isValid(cargo2npm(input));
}
function matches(version, range) {
	return api$1.matches(version, cargo2npm(range));
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions, cargo2npm(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions, cargo2npm(range));
}
function isSingleVersion(constraint) {
	return constraint.trim().startsWith("=") && isVersion(constraint.trim().substring(1).trim());
}
function getPinnedValue(newVersion) {
	return `=${newVersion}`;
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	if (!currentValue || currentValue === "*") return currentValue;
	if (rangeStrategy === "bump" && regEx(/^\d+(?:\.\d+)*$/).test(currentValue)) return newVersion;
	if (isSingleVersion(currentValue)) {
		let res = "=";
		if (currentValue.startsWith("= ")) res += " ";
		res += newVersion;
		return res;
	}
	if (rangeStrategy === "replace" && matches(newVersion, currentValue)) return currentValue;
	const newSemver = api$1.getNewValue({
		currentValue: cargo2npm(currentValue),
		rangeStrategy,
		currentVersion,
		newVersion
	});
	let newCargo = newSemver ? npm2cargo(newSemver) : /* istanbul ignore next: should never happen */ null;
	// istanbul ignore if
	if (!newCargo) {
		logger.info({
			currentValue,
			newSemver
		}, "Could not get cargo version from semver");
		return currentValue;
	}
	if ((currentValue.startsWith("~") || currentValue.startsWith("^")) && rangeStrategy === "replace" && newCargo.split(".").length > currentValue.split(".").length) newCargo = newCargo.split(".").slice(0, currentValue.split(".").length).join(".");
	if (newCargo.startsWith("^") && !currentValue.startsWith("^")) {
		const withoutCaret = newCargo.substring(1);
		const components = currentValue.split(".").length;
		newCargo = withoutCaret.split(".").slice(0, components).join(".");
	}
	return newCargo;
}
function subset(subRange, superRange) {
	try {
		return api$1.subset(cargo2npm(subRange), cargo2npm(superRange));
	} catch (err) {
		logger.debug({ err }, "cargo.subset error");
		return false;
	}
}
function intersects(subRange, superRange) {
	try {
		return api$1.intersects(cargo2npm(subRange), cargo2npm(superRange));
	} catch (err) {
		logger.debug({ err }, "cargo.intersects error");
		return false;
	}
}
function isBreaking(current, version) {
	if (!stable.is(version) || !stable.is(current)) return true;
	const currentMajor = major(current);
	if (currentMajor === 0) {
		if (minor(current) === 0) return current !== version;
		return minor(current) !== minor(version);
	}
	return currentMajor !== major(version);
}
const api = {
	...api$1,
	getNewValue,
	getPinnedValue,
	isBreaking,
	isLessThanRange,
	isSingleVersion,
	isValid,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	subset,
	intersects
};
//#endregion
export { api, api as default, id, isValid };

//# sourceMappingURL=index.js.map