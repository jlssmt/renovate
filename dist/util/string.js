//#region lib/util/string.ts
function matchAt(content, index, match) {
	return content.substring(index, index + match.length) === match;
}
function replaceAt(content, index, oldString, newString) {
	return content.substring(0, index) + newString + content.substring(index + oldString.length);
}
/**
* Converts from utf-8 string to base64-encoded string
*/
function toBase64(input) {
	return Buffer.from(input).toString("base64");
}
/**
* Converts from base64-encoded string to utf-8 string
*/
function fromBase64(input) {
	return Buffer.from(input, "base64").toString();
}
function uniqueStrings(element, index, elements) {
	return elements.indexOf(element) === index;
}
function looseEquals(a, b) {
	if (!(a && b)) return a === b;
	return a.localeCompare(b, void 0, { sensitivity: "base" }) === 0;
}
function titleCase(input) {
	const words = input.toLowerCase().split(" ");
	for (let i = 0; i < words.length; i++) {
		const word = words[i];
		words[i] = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
	}
	return words.join(" ");
}
/**
* Sometimes we extract small strings from a multi-megabyte files.
* If we then save them in the in-memory cache, V8 may not free
* the initial buffer, which can lead to memory leaks:
*
*   https://bugs.chromium.org/p/v8/issues/detail?id=2869
*
*/
function copystr(x) {
	const len = Buffer.byteLength(x, "utf8");
	const buf = Buffer.allocUnsafeSlow(len);
	buf.write(x, "utf8");
	return buf.toString("utf8");
}
/**
* Coerce a value to a string with optional default value.
* @param val value to coerce
* @returns the coerced value.
*/
function coerceString(val, def) {
	return val ?? def ?? "";
}
/**
* Remove templates from string.
*
* This is more performant version of this code:
*
* ```
*   content
*     .replaceAll(regEx(/{{`.+?`}}/gs), '')
*     .replaceAll(regEx(/{{.+?}}/gs), '')
*     .replaceAll(regEx(/{%`.+?`%}/gs), '')
*     .replaceAll(regEx(/{%.+?%}/gs), '')
*     .replaceAll(regEx(/{#.+?#}/gs), '')
* ```
*/
function stripTemplates(content) {
	const result = [];
	const len = content.length;
	let idx = 0;
	let lastPos = 0;
	while (idx < len) {
		if (content[idx] === "{" && idx + 1 < len) {
			let closing;
			let skipLength = 0;
			if (content[idx + 1] === "%") {
				if (idx + 2 < len && content[idx + 2] === "`") {
					closing = "`%}";
					skipLength = 3;
				} else {
					closing = "%}";
					skipLength = 2;
				}
			} else if (content[idx + 1] === "{") {
				if (idx + 2 < len && content[idx + 2] === "`") {
					closing = "`}}";
					skipLength = 3;
				} else {
					closing = "}}";
					skipLength = 2;
				}
			} else if (content[idx + 1] === "#") {
				closing = "#}";
				skipLength = 2;
			}
			if (closing) {
				const end = content.indexOf(closing, idx + skipLength);
				if (end !== -1) {
					if (idx > lastPos) result.push(content.slice(lastPos, idx));
					idx = end + closing.length;
					lastPos = idx;
					continue;
				}
			}
		}
		idx++;
	}
	if (lastPos < len) result.push(content.slice(lastPos));
	return result.join("");
}
function capitalize(input) {
	return input[0].toUpperCase() + input.slice(1);
}
//#endregion
export { capitalize, coerceString, copystr, fromBase64, looseEquals, matchAt, replaceAt, stripTemplates, titleCase, toBase64, uniqueStrings };

//# sourceMappingURL=string.js.map