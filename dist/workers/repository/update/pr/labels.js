import { coerceArray } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import { platform } from "../../../../modules/platform/index.js";
import { isArray, isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/workers/repository/update/pr/labels.ts
/**
* Filter labels that go over the maximum char limit, based on platform limits.
*/
function trimLabel(label, limit) {
	const trimmed = label.trim();
	if (trimmed.length <= limit) return trimmed;
	return trimmed.slice(0, limit).trim();
}
function prepareLabels(config) {
	const labelCharLimit = platform.labelCharLimit?.() ?? 50;
	const labels = coerceArray(config.labels);
	const addLabels = coerceArray(config.addLabels);
	return [.../* @__PURE__ */ new Set([...labels, ...addLabels])].filter(isNonEmptyStringAndNotWhitespace).map((label) => compile(label, config)).filter(isNonEmptyStringAndNotWhitespace).map((label) => trimLabel(label, labelCharLimit)).sort();
}
/**
* Determine changed labels between old and new label arrays.
*
* This function takes two arrays of labels, 'oldLabels' and 'newLabels', and calculates the labels
* that need to be added and removed to transition from 'oldLabels' to 'newLabels'.
*/
function getChangedLabels(oldLabels, newLabels) {
	return [newLabels?.filter((l) => !oldLabels?.includes(l)), oldLabels?.filter((l) => !newLabels?.includes(l))];
}
/**
* Check if labels in the PR have been modified.
*
* This function compares two arrays of labels, 'prInitialLabels' and 'prCurrentLabels',
* to determine if they are different, indicating that labels in the PR have been modified.
*/
function areLabelsModified(prInitialLabels, prCurrentLabels) {
	const modified = !dequal(prInitialLabels.sort(), prCurrentLabels.sort());
	if (modified) logger.debug({
		prInitialLabels,
		prCurrentLabels
	}, "PR labels have been modified by user, skipping labels update");
	return modified;
}
/**
* Determine if labels should be updated in the Pull Request.
*/
function shouldUpdateLabels(prInitialLabels, prCurrentLabels, configuredLabels) {
	if (!isArray(prInitialLabels)) return false;
	if (dequal(coerceArray(configuredLabels).sort(), prInitialLabels.sort())) return false;
	if (areLabelsModified(prInitialLabels, coerceArray(prCurrentLabels))) {
		logger.debug("Labels have been modified by user - skipping labels update.");
		return false;
	}
	logger.debug("Labels have been changed in repo config- updating labels.");
	return true;
}
//#endregion
export { areLabelsModified, getChangedLabels, prepareLabels, shouldUpdateLabels };

//# sourceMappingURL=labels.js.map