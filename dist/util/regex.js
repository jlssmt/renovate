import { CONFIG_VALIDATION } from "../constants/error-messages.js";
import { re2 } from "../expose.js";
import { getEnv } from "./env.js";
import { isRegExp } from "@sindresorhus/is";
//#region lib/util/regex.ts
const cache = /* @__PURE__ */ new Map();
let status;
let RegEx = RegExp;
/* v8 ignore if -- RE2 is always enabled in the test environment */
if (getEnv().RENOVATE_X_IGNORE_RE2) status = { type: "ignored" };
else try {
	const RE2 = re2();
	new RE2(".*").exec("test");
	RegEx = RE2;
	status = { type: "available" };
} catch (err) {
	status = {
		type: "unavailable",
		err
	};
}
const regexEngineStatus = status;
function regEx(pattern, flags, useCache = true) {
	let canBeCached = useCache;
	if (canBeCached && flags?.includes("g")) canBeCached = false;
	if (canBeCached && isRegExp(pattern) && pattern.flags.includes("g")) canBeCached = false;
	const key = flags ? `${pattern.toString()}:${flags}` : pattern.toString();
	if (canBeCached) {
		const cachedResult = cache.get(key);
		if (cachedResult) return cachedResult;
	}
	try {
		const instance = flags ? new RegEx(pattern, flags) : new RegEx(pattern);
		if (canBeCached) cache.set(key, instance);
		return instance;
	} catch (err) {
		const error = new Error(CONFIG_VALIDATION);
		error.validationMessage = err.message;
		error.validationSource = pattern.toString();
		error.validationError = `Invalid regular expression (re2): ${pattern.toString()}`;
		throw error;
	}
}
const newlineRegex = regEx(/\r?\n/);
/**
* Matches hidden or invisible Unicode characters, including:
* - Non-breaking space (\u00A0)
* - Ogham space mark (\u1680)
* - Various spaces (\u2000-\u200A)
* - Line separator (\u2028)
* - Paragraph separator (\u2029)
* - Narrow no-break space (\u202F)
* - Medium mathematical space (\u205F)
* - Ideographic space (\u3000)
* - Zero-width space (\u200B)
* - Zero-width non-joiner (\u200C)
* - Zero-width no-break space (\uFEFF)
* - Left-to-right mark (\u200E)
* - Right-to-left mark (\u200F)
* - Bidirectional formatting characters (\u202A-\u202E)
* - Soft hyphen (\u00AD)
*/
const hiddenUnicodeCharactersRegex = regEx(/(?<char>[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\u200B\u200C\uFEFF\u200E\u200F\u202A-\u202E\u00AD])/g);
/**
* Given unicode character(s), convert them to the \u0123 representation, to be output to a user.
*/
function toUnicodeEscape(str) {
	const items = new Set(str.split("").map((char) => {
		return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()}`;
	}));
	return Array.from(items).join("");
}
//#endregion
export { hiddenUnicodeCharactersRegex, newlineRegex, regEx, regexEngineStatus, toUnicodeEscape };

//# sourceMappingURL=regex.js.map