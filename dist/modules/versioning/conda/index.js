import { regEx } from "../../../util/regex.js";
import { api as api$1 } from "../pep440/index.js";
import { Version, VersionSpec } from "@baszalmstra/rattler";
//#region lib/modules/versioning/conda/index.ts
function parse(v) {
	try {
		return new Version(v);
	} catch {
		return null;
	}
}
const id = "conda";
function isValidVersion(s) {
	try {
		new Version(s);
		return true;
	} catch {
		return false;
	}
}
function isValidVersionSpec(s) {
	try {
		new VersionSpec(s);
		return true;
	} catch {
		return false;
	}
}
function isValid(input) {
	return isValidVersion(input) || isValidVersionSpec(input);
}
function matches(version, range) {
	try {
		return new VersionSpec(range).matches(new Version(version));
	} catch {
		return false;
	}
}
function isSingleVersion(input) {
	if (!input.startsWith("=")) return false;
	return isValidVersion(input.replace(regEx(/^==/), "").trimStart());
}
function getPinnedValue(newVersion) {
	return `==${newVersion}`;
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion, isReplacement }) {
	if (currentValue === "*") {
		if (rangeStrategy === "bump") return `>=${newVersion}`;
		return null;
	}
	const normalizedCurrentValue = new VersionSpec(currentValue).toString();
	if (regEx(/^(?:\d+\.)+\*$/).test(normalizedCurrentValue))
 // v8 ignore next -- pep440 always answers for a well-formed `==X.Y.*`
	return api$1.getNewValue({
		currentValue: `==${normalizedCurrentValue}`,
		rangeStrategy,
		currentVersion,
		newVersion,
		isReplacement
	})?.replace(regEx(/^==/), "") ?? null;
	return api$1.getNewValue({
		currentValue: normalizedCurrentValue,
		rangeStrategy,
		currentVersion,
		newVersion,
		isReplacement
	});
}
function sortVersions(version, other) {
	return new Version(version).compare(new Version(other));
}
function equals(version, other) {
	const v2 = parse(other);
	if (!v2) return false;
	return parse(version)?.equals(v2) ?? false;
}
function isStable(version) {
	return !(parse(version)?.isDev ?? true);
}
function isCompatible(_version, _current) {
	return true;
}
function getMajor(version) {
	return parse(version)?.asMajorMinor?.()?.[0] ?? null;
}
function getMinor(version) {
	return parse(version)?.asMajorMinor?.()?.[1] ?? null;
}
function getPatch(version) {
	try {
		return api$1.getPatch(version);
	} catch {
		return null;
	}
}
function isGreaterThan(version, other) {
	return sortVersions(version, other) > 0;
}
function getSatisfyingVersion(versions, range) {
	const spec = new VersionSpec(range);
	const satisfiedVersions = versions.map((v) => {
		return [new Version(v), v];
	}).filter(([v, _raw]) => spec.matches(v)).sort((a, b) => {
		return a[0].compare(b[0]);
	});
	if (satisfiedVersions.length === 0) return null;
	return satisfiedVersions.at(-1)[1];
}
function minSatisfyingVersion(versions, range) {
	const spec = new VersionSpec(range);
	const satisfiedVersions = versions.map((v) => {
		return [new Version(v), v];
	}).filter(([v, _raw]) => spec.matches(v)).sort((a, b) => {
		return a[0].compare(b[0]);
	});
	if (satisfiedVersions.length === 0) return null;
	return satisfiedVersions[0][1];
}
const api = {
	equals,
	isValid,
	isVersion: isValidVersion,
	isSingleVersion,
	isStable,
	isCompatible,
	getMajor,
	getMinor,
	getPatch,
	isGreaterThan,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue,
	getPinnedValue,
	matches,
	sortVersions
};
//#endregion
export { api, id };

//# sourceMappingURL=index.js.map