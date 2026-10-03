import { compile } from "../../../../util/template/index.js";
import { get } from "../../../../modules/versioning/index.js";
import { getRangeStrategy } from "../../../../modules/manager/index.js";
import { isNonEmptyString, isNullOrUndefined, isString } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/utils.ts
function addReplacementUpdateIfValid(updates, config) {
	const replacementNewName = determineNewReplacementName(config);
	const replacementNewValue = determineNewReplacementValue(config);
	if (config.packageName !== replacementNewName || config.currentValue !== replacementNewValue) updates.push({
		updateType: "replacement",
		newName: replacementNewName,
		newValue: replacementNewValue
	});
}
function isReplacementRulesConfigured(config) {
	return isNonEmptyString(config.replacementName) || isNonEmptyString(config.replacementNameTemplate) || isNonEmptyString(config.replacementVersion) || isNonEmptyString(config.replacementVersionTemplate);
}
function determineNewReplacementName(config) {
	if (config.replacementName) return config.replacementName;
	if (config.replacementNameTemplate) return compile(config.replacementNameTemplate, config, true);
	return config.packageName;
}
function determineNewReplacementValue(config) {
	const newVersion = getNewVersion(config);
	if (!newVersion) return config.currentValue;
	const versioningApi = get(config.versioning);
	const rangeStrategy = getRangeStrategy(config);
	return versioningApi.getNewValue({
		currentValue: config.currentValue,
		newVersion,
		rangeStrategy,
		isReplacement: true
	});
}
function getNewVersion(config) {
	if (!isNullOrUndefined(config.replacementVersion)) return config.replacementVersion;
	if (!isNullOrUndefined(config.replacementVersionTemplate)) return compile(config.replacementVersionTemplate, config, true);
	return null;
}
/**
* Drop every update which would not actually change the package file, plus the
* updates excluded by `rangeStrategy=in-range-only` and by the `rollbackPrs` +
* `followTag` edge case.
*/
function stripNoopUpdates(config, updates) {
	let result = updates.filter((update) => update.newValue !== null || config.currentValue === null).filter((update) => update.newDigest !== null).filter((update) => isString(update.newName) && update.newName !== config.packageName || update.isReplacement === true || update.newValue !== config.currentValue || update.isLockfileUpdate === true || update.newDigest && !update.newDigest.startsWith(config.currentDigest));
	if (config.rangeStrategy === "in-range-only") result = result.filter((update) => update.newValue === config.currentValue);
	if (config.rollbackPrs && config.followTag) result = result.filter((update) => update.updateType !== "rollback" || result.length === 1);
	return result;
}
//#endregion
export { addReplacementUpdateIfValid, determineNewReplacementName, determineNewReplacementValue, isReplacementRulesConfigured, stripNoopUpdates };

//# sourceMappingURL=utils.js.map