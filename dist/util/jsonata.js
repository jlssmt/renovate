import { get, set } from "./cache/memory/index.js";
import { anyMatchRegexOrGlobList, matchRegexOrGlobList } from "./string-match.js";
import { detectPlatform } from "./common.js";
import { toSha256 } from "./hash.js";
import { isArray, isNonEmptyArray, isString } from "@sindresorhus/is";
import jsonata from "jsonata";
//#region lib/util/jsonata.ts
/**
* Matches `input` against Renovate string patterns (globs, regex, negation).
* If `input` is an array, returns true if any string element matches.
* Returns false for missing or non-string inputs and invalid patterns.
*/
function matchRegexOrGlob(input, patterns) {
	const patternList = isString(patterns) ? [patterns] : patterns;
	if (!isNonEmptyArray(patternList) || !patternList.every(isString)) return false;
	if (isString(input)) return matchRegexOrGlobList(input, patternList);
	if (isArray(input)) return anyMatchRegexOrGlobList(input.filter(isString), patternList);
	return false;
}
function getExpression(input) {
	const cacheKey = `jsonata:${toSha256(input)}`;
	const cachedExpression = get(cacheKey);
	// istanbul ignore if: cannot test
	if (cachedExpression) return cachedExpression;
	let result;
	try {
		const expression = jsonata(input);
		expression.registerFunction("detectPlatform", (url) => detectPlatform(url), "<s-:s>");
		expression.registerFunction("matchRegexOrGlob", matchRegexOrGlob);
		const originalEvaluate = expression.evaluate.bind(expression);
		expression.evaluate = (data, bindings = {}) => {
			return originalEvaluate(data, bindings);
		};
		result = expression;
	} catch (err) {
		result = new Error(err.message);
	}
	set(cacheKey, result);
	return result;
}
//#endregion
export { getExpression, matchRegexOrGlob };

//# sourceMappingURL=jsonata.js.map