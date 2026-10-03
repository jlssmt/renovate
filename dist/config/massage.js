import { coerceArray } from "../util/array.js";
import { clone } from "../util/clone.js";
import { toMs } from "../util/pretty-time.js";
import { getOptions } from "./options/index.js";
import { isArray, isNonEmptyArray, isObject, isString } from "@sindresorhus/is";
//#region lib/config/massage.ts
const options = getOptions();
let allowedStrings;
function massageConfig(config) {
	if (!allowedStrings) {
		allowedStrings = [];
		options.forEach((option) => {
			if (option.allowString) allowedStrings.push(option.name);
		});
	}
	const massagedConfig = clone(config);
	for (const [key, val] of Object.entries(config)) if (key === "minimumReleaseAge" && isString(val) && toMs(val) === 0) massagedConfig.minimumReleaseAge = null;
	else if (allowedStrings.includes(key) && isString(val)) massagedConfig[key] = [val];
	else if (isArray(val)) {
		massagedConfig[key] = [];
		val.forEach((item) => {
			if (isObject(item)) massagedConfig[key].push(massageConfig(item));
			else massagedConfig[key].push(item);
		});
	} else if (isObject(val) && key !== "encrypted") massagedConfig[key] = massageConfig(val);
	if (isNonEmptyArray(massagedConfig.packageRules)) {
		let newRules = [];
		const updateTypes = [
			"major",
			"minor",
			"patch",
			"pin",
			"digest",
			"rollback"
		];
		for (const rule of massagedConfig.packageRules) {
			newRules.push(rule);
			for (const [key, val] of Object.entries(rule)) if (updateTypes.includes(key)) {
				let newRule = clone(rule);
				Object.keys(newRule).forEach((newKey) => {
					if (!(newKey.startsWith(`match`) || newKey.startsWith("exclude"))) delete newRule[newKey];
				});
				newRule.matchUpdateTypes = coerceArray(rule.matchUpdateTypes);
				newRule.matchUpdateTypes.push(key);
				newRule = {
					...newRule,
					...val
				};
				newRules.push(newRule);
			}
		}
		for (const rule of newRules) updateTypes.forEach((updateType) => {
			delete rule[updateType];
		});
		newRules = newRules.filter((rule) => {
			if (Object.keys(rule).every((key) => key.startsWith("match") || key.startsWith("exclude"))) return false;
			return true;
		});
		massagedConfig.packageRules = newRules;
	}
	return massagedConfig;
}
//#endregion
export { massageConfig };

//# sourceMappingURL=massage.js.map