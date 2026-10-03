import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/homebrew/utils.ts
function extractRubyString(content, keyword) {
	const regex = regEx(`\\b${keyword}\\s+(?:"(?<double>[^"]+)"|'(?<single>[^']+)')`);
	const match = content.match(regex);
	return match?.groups?.double ?? match?.groups?.single ?? null;
}
function updateRubyString(content, keyword, oldValue, newValue) {
	const doubleQuote = regEx(`(\\b${keyword}\\s+)"${RegExp.escape(oldValue)}"`, "g");
	const singleQuote = regEx(`(\\b${keyword}\\s+)'${RegExp.escape(oldValue)}'`, "g");
	const result = content.replace(doubleQuote, `$1"${newValue}"`).replace(singleQuote, `$1'${newValue}'`);
	return result === content ? null : result;
}
//#endregion
export { extractRubyString, updateRubyString };

//# sourceMappingURL=utils.js.map