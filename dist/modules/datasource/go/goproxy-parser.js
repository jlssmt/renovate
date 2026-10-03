import { get, set } from "../../../util/cache/memory/index.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { isString, isTruthy } from "@sindresorhus/is";
import moo from "moo";
//#region lib/modules/datasource/go/goproxy-parser.ts
/**
* Parse `GOPROXY` to the sequence of url + fallback strategy tags.
*
* @example
* parseGoproxy('foo.example.com|bar.example.com,baz.example.com')
* // [
* //   { url: 'foo.example.com', fallback: '|' },
* //   { url: 'bar.example.com', fallback: ',' },
* //   { url: 'baz.example.com', fallback: '|' },
* // ]
*
* @see https://golang.org/ref/mod#goproxy-protocol
*/
function parseGoproxy(input = getEnv().GOPROXY) {
	if (!isString(input)) return [];
	const cacheKey = `goproxy::${input}`;
	const cachedResult = get(cacheKey);
	if (cachedResult) return cachedResult;
	const result = input.split(regEx(/(?<segment>[^,|]*(?:,|\|))/)).filter(isTruthy).map((s) => s.split(regEx(/(?<separator>,|\|)/))).filter(([url]) => isTruthy(url)).map(([url, separator]) => ({
		url,
		fallback: separator === "," ? "," : "|"
	}));
	set(cacheKey, result);
	return result;
}
const noproxyLexer = moo.states({
	main: {
		separator: {
			match: /\s*?,\s*?/,
			value: (_) => "|"
		},
		asterisk: {
			match: "*",
			value: (_) => "[^/]*"
		},
		qmark: {
			match: "?",
			value: (_) => "[^/]"
		},
		characterRangeOpen: {
			match: "[",
			push: "characterRange",
			value: (_) => "["
		},
		trailingSlash: {
			match: /\/$/,
			value: (_) => ""
		},
		char: {
			match: /[^*?\\[\n]/,
			value: (s) => s.replace(regEx("\\.", "g"), "\\.")
		},
		escapedChar: {
			match: /\\./,
			value: (s) => s.slice(1)
		}
	},
	characterRange: {
		char: /[^\\\]\n]/,
		escapedChar: {
			match: /\\./,
			value: (s) => s.slice(1)
		},
		characterRangeEnd: {
			match: "]",
			pop: 1
		}
	}
});
function parseNoproxy(input = (() => {
	const env = getEnv();
	return env.GONOPROXY ?? env.GOPRIVATE;
})()) {
	if (!isString(input)) return null;
	const cacheKey = `noproxy::${input}`;
	const cachedResult = get(cacheKey);
	if (cachedResult !== void 0) return cachedResult;
	const noproxyPattern = [...noproxyLexer.reset(input)].map(({ value }) => value).join("");
	const result = noproxyPattern ? regEx(`^(?:${noproxyPattern})(?:/.*)?$`) : null;
	set(cacheKey, result);
	return result;
}
//#endregion
export { parseGoproxy, parseNoproxy };

//# sourceMappingURL=goproxy-parser.js.map