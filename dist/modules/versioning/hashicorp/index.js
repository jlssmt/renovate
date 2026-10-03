import { logger } from "../../../logger/index.js";
import { api as api$1 } from "../npm/index.js";
import { getExcludedVersions, getFilteredRange } from "../common.js";
import { hashicorp2npm, npm2hashicorp } from "./convertor.js";
//#region lib/modules/versioning/hashicorp/index.ts
const id = "hashicorp";
function isLessThanRange(version, range) {
	return !!api$1.isLessThanRange?.(version, hashicorp2npm(range));
}
function isValid(input) {
	if (input) try {
		return api$1.isValid(hashicorp2npm(input));
	} catch {
		logger.trace({ value: input }, "Unsupported hashicorp versioning value");
		return false;
	}
	return false;
}
function matches(version, range) {
	if (getExcludedVersions(range).includes(version)) return false;
	const filteredRange = getFilteredRange(range);
	return isValid(filteredRange) && api$1.matches(version, hashicorp2npm(filteredRange));
}
function getSatisfyingVersion(versions, range) {
	const excludedVersions = getExcludedVersions(range);
	const filteredRange = getFilteredRange(range);
	const filteredVersions = versions.filter((version) => !excludedVersions.includes(version));
	return api$1.getSatisfyingVersion(filteredVersions, hashicorp2npm(filteredRange));
}
function minSatisfyingVersion(versions, range) {
	const excludedVersions = getExcludedVersions(range);
	const filteredRange = getFilteredRange(range);
	const filteredVersions = versions.filter((version) => !excludedVersions.includes(version));
	return api$1.minSatisfyingVersion(filteredVersions, hashicorp2npm(filteredRange));
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	let npmNewVersion = api$1.getNewValue({
		currentValue: hashicorp2npm(currentValue),
		rangeStrategy,
		currentVersion,
		newVersion
	});
	if (npmNewVersion) {
		npmNewVersion = npm2hashicorp(npmNewVersion);
		if (currentValue.startsWith("v") && !npmNewVersion.startsWith("v")) npmNewVersion = `v${npmNewVersion}`;
	}
	return npmNewVersion;
}
const api = {
	...api$1,
	isLessThanRange,
	isValid,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	getNewValue
};
const { isVersion } = api;
//#endregion
export { api, api as default, id, isValid };

//# sourceMappingURL=index.js.map