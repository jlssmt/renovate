import { getRegexPredicate, isRegexMatch } from "../../util/string-match.js";
import { ConfigValidationTopic } from "./types.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/config/validation-helpers/regex-glob-matchers.ts
/**
* Only if type condition or context condition violated then errors array will be mutated to store metadata
*/
function check({ val: matchers, currentPath }) {
	const res = [];
	if (isArray(matchers, isString)) {
		if ((matchers.includes("*") || matchers.includes("**")) && matchers.length > 1) res.push({
			topic: ConfigValidationTopic.Error,
			message: `${currentPath}: Your input contains * or ** along with other patterns. Please remove them, as * or ** matches all patterns.`
		});
		for (const matcher of matchers) if (isRegexMatch(matcher) && !getRegexPredicate(matcher)) res.push({
			topic: ConfigValidationTopic.Error,
			message: `Failed to parse regex pattern for ${currentPath}: ${matcher}`
		});
	} else res.push({
		topic: ConfigValidationTopic.Error,
		message: `${currentPath}: should be an array of strings. You have included ${typeof matchers}.`
	});
	return res;
}
//#endregion
export { check };

//# sourceMappingURL=regex-glob-matchers.js.map