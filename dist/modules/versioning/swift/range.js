import { regEx } from "../../../util/regex.js";
import semver from "semver";
//#region lib/modules/versioning/swift/range.ts
const fromParam = regEx(/^\s*from\s*:\s*"(?<version>[^"]+)"\s*$/);
const fromRange = regEx(/^\s*"(?<version>[^"]+)"\s*\.\.\.\s*$/);
const binaryRange = regEx(/^\s*"(?<currentVersion>[^"]+)"\s*(?<op>\.\.[.<])\s*"(?<newVersion>[^"]+)"\s*$/);
const toRange = regEx(/^\s*(?<op>\.\.[.<])\s*"(?<newVersion>[^"]+)"\s*$/);
const vPrefix = regEx(/^v(?<major>[0-9]+)/);
function toSemverRange(range) {
	const fromParamMatch = fromParam.exec(range);
	if (fromParamMatch) {
		const { version } = fromParamMatch.groups;
		if (semver.valid(version)) return `>=${version} <${`${semver.major(version) + 1}.0.0`}`;
		return null;
	}
	const fromRangeMatch = fromRange.exec(range);
	if (fromRangeMatch) {
		const { version } = fromRangeMatch.groups;
		if (semver.valid(version)) return `>=${version}`;
		return null;
	}
	const binaryRangeMatch = binaryRange.exec(range);
	if (binaryRangeMatch) {
		const { currentVersion, op, newVersion } = binaryRangeMatch.groups;
		if (semver.valid(currentVersion) && semver.valid(newVersion)) return op === "..<" ? `>=${currentVersion} <${newVersion}` : `>=${currentVersion} <=${newVersion}`;
		return null;
	}
	const toRangeMatch = toRange.exec(range);
	if (toRangeMatch) {
		const { op, newVersion } = toRangeMatch.groups;
		if (semver.valid(newVersion)) return op === "..<" ? `<${newVersion}` : `<=${newVersion}`;
	}
	return null;
}
function getNewValue({ currentValue, newVersion }) {
	const cleanNewVersion = newVersion.replace(vPrefix, "$<major>");
	if (fromParam.test(currentValue)) return currentValue.replace(regEx(/".*?"/), `"${cleanNewVersion}"`);
	const fromRangeMatch = fromRange.exec(currentValue);
	if (fromRangeMatch) {
		const { version } = fromRangeMatch.groups;
		return currentValue.replace(version, cleanNewVersion);
	}
	const binaryRangeMatch = binaryRange.exec(currentValue);
	if (binaryRangeMatch) {
		const { newVersion: version } = binaryRangeMatch.groups;
		return currentValue.replace(version, cleanNewVersion);
	}
	const toRangeMatch = toRange.exec(currentValue);
	if (toRangeMatch) {
		const { newVersion: version } = toRangeMatch.groups;
		return currentValue.replace(version, cleanNewVersion);
	}
	return cleanNewVersion;
}
//#endregion
export { getNewValue, toSemverRange };

//# sourceMappingURL=range.js.map