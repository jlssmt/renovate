import { regEx } from "./regex.js";
import { minimatch } from "./minimatch.js";
import { isString } from "@sindresorhus/is";
//#region lib/util/string-match.ts
function isDockerDigest(input) {
	return regEx(/^sha256:[a-f0-9]{64}$/i).test(input);
}
function getRegexOrGlobPredicate(pattern) {
	const regExPredicate = getRegexPredicate(pattern);
	if (regExPredicate) return regExPredicate;
	const mm = minimatch(pattern, {
		dot: true,
		nocase: true
	});
	return (x) => mm.match(x);
}
function matchRegexOrGlob(input, pattern) {
	if (pattern === "*") return true;
	return getRegexOrGlobPredicate(pattern)(input);
}
function matchRegexOrGlobList(input, patterns) {
	if (!patterns.length) return false;
	const positivePatterns = patterns.filter((pattern) => !pattern.startsWith("!"));
	if (positivePatterns.length && !positivePatterns.some((pattern) => matchRegexOrGlob(input, pattern))) return false;
	const negativePatterns = patterns.filter((pattern) => pattern.startsWith("!"));
	if (negativePatterns.length && !negativePatterns.every((pattern) => matchRegexOrGlob(input, pattern))) return false;
	return true;
}
function anyMatchRegexOrGlobList(inputs, patterns) {
	return inputs.some((input) => matchRegexOrGlobList(input, patterns));
}
const UUIDRegex = regEx(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const configValStart = regEx(/^!?\//);
const configValEnd = regEx(/\/i?$/);
function isRegexMatch(input) {
	return isString(input) && configValStart.test(input) && configValEnd.test(input);
}
function parseRegexMatch(input) {
	try {
		const regexString = input.replace(configValStart, "").replace(configValEnd, "");
		return input.endsWith("i") ? regEx(regexString, "i") : regEx(regexString);
	} catch {}
	return null;
}
function getRegexPredicate(input) {
	if (isRegexMatch(input)) {
		const configRegex = parseRegexMatch(input);
		if (configRegex) {
			const isPositive = !input.startsWith("!");
			return (x) => {
				const res = configRegex.test(x);
				return isPositive ? res : !res;
			};
		}
	}
	return null;
}
//#endregion
export { UUIDRegex, anyMatchRegexOrGlobList, getRegexOrGlobPredicate, getRegexPredicate, isDockerDigest, isRegexMatch, matchRegexOrGlob, matchRegexOrGlobList };

//# sourceMappingURL=string-match.js.map