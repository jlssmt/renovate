import { coerceObject } from "../../../../util/object.js";
import { regEx } from "../../../../util/regex.js";
import { checkIsValidDependency } from "../utils.js";
import { createDependency, mergeExtractionTemplate, mergeGroups, regexMatchAll } from "./utils.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/custom/regex/strategies.ts
function handleAny(config, packageFileInfo) {
	const { content, packageFile } = packageFileInfo;
	return config.matchStrings.map((matchString) => regEx(matchString, "g")).flatMap((regex) => regexMatchAll(regex, content)).map((matchResult) => createDependency({
		groups: coerceObject(matchResult.groups),
		replaceString: matchResult[0]
	}, config, packageFileInfo)).filter(isTruthy).filter((dep) => checkIsValidDependency(dep, packageFile, "regex"));
}
function handleCombination(config, packageFileInfo) {
	const { content, packageFile } = packageFileInfo;
	const matches = config.matchStrings.map((matchString) => regEx(matchString, "g")).flatMap((regex) => regexMatchAll(regex, content));
	if (!matches.length) return [];
	const extraction = matches.map((match) => ({
		groups: coerceObject(match.groups),
		replaceString: match?.groups?.currentValue ?? match?.groups?.currentDigest ? match[0] : void 0
	})).reduce((base, addition) => mergeExtractionTemplate(base, addition));
	return [createDependency(extraction, config, packageFileInfo)].filter(isTruthy).filter((dep) => checkIsValidDependency(dep, packageFile, "regex"));
}
function handleRecursive(config, packageFileInfo) {
	const { content, packageFile } = packageFileInfo;
	return processRecursive({
		content,
		packageFileInfo,
		config,
		index: 0,
		combinedGroups: {},
		regexes: config.matchStrings.map((matchString) => regEx(matchString, "g"))
	}).filter(isTruthy).filter((dep) => checkIsValidDependency(dep, packageFile, "regex"));
}
function processRecursive(parameters) {
	const { content, index, combinedGroups, regexes, config, packageFileInfo } = parameters;
	if (regexes.length === index) {
		const result = createDependency({
			groups: combinedGroups,
			replaceString: content
		}, config, packageFileInfo);
		return result ? [result] : /* istanbul ignore next: can this happen? */ [];
	}
	return regexMatchAll(regexes[index], content).flatMap((match) => {
		return processRecursive({
			...parameters,
			content: match[0],
			index: index + 1,
			combinedGroups: mergeGroups(combinedGroups, coerceObject(match.groups))
		});
	});
}
//#endregion
export { handleAny, handleCombination, handleRecursive };

//# sourceMappingURL=strategies.js.map