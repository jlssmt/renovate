import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { isString } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/version-compatibility.ts
/**
* Split `currentValue` into its version and compatibility parts using the
* `versionCompatibility` regex.
*
* Returns `null` when `versionCompatibility` is not configured or does not
* match, in which case `currentValue` is compared as-is.
*/
function matchVersionCompatibility(config) {
	const { currentValue, packageName, versionCompatibility } = config;
	if (!isString(currentValue) || !isString(versionCompatibility)) return null;
	const regexMatch = regEx(versionCompatibility).exec(currentValue);
	if (!regexMatch?.groups) {
		logger.debug({
			versionCompatibility,
			currentValue,
			packageName
		}, "version compatibility regex mismatch");
		return null;
	}
	logger.debug({
		versionCompatibility,
		currentValue,
		packageName,
		groups: regexMatch.groups
	}, "version compatibility regex match");
	return {
		compareValue: regexMatch.groups.version,
		currentCompatibility: regexMatch.groups.compatibility
	};
}
/**
* Put the compatibility part back onto each update's `newValue`, undoing the
* split performed by `matchVersionCompatibility()`.
*/
function restoreVersionCompatibility(config, compareValue, updates) {
	const { currentValue, versionCompatibility } = config;
	if (!isString(currentValue) || !isString(compareValue) || !isString(versionCompatibility)) return;
	for (const update of updates) {
		logger.debug({ update });
		// v8 ignore else -- see #40625
		if (isString(update.newValue)) update.newValue = currentValue.replace(compareValue, update.newValue);
	}
}
//#endregion
export { matchVersionCompatibility, restoreVersionCompatibility };

//# sourceMappingURL=version-compatibility.js.map