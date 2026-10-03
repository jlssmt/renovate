import { regEx } from "./regex.js";
import { coerceString } from "./string.js";
import { logger } from "../logger/index.js";
import { Json } from "./schema-utils/index.js";
import data from "../data-files.generated.js";
import { Result } from "./result.js";
import { z } from "zod/v4";
import mathiasBynensEmojiRegex from "emoji-regex";
import { fromCodepointToUnicode, fromHexcodeToCodepoint, fromUnicodeToHexcode } from "emojibase";
import emojibaseEmojiRegex from "emojibase-regex/emoji.js";
import SHORTCODE_REGEX from "emojibase-regex/shortcode.js";
//#region lib/util/emoji.ts
let unicodeEmoji = true;
let mappingsInitialized = false;
const shortCodesByHex = /* @__PURE__ */ new Map();
const hexCodesByShort = /* @__PURE__ */ new Map();
const EmojiShortcodes = Json.pipe(z.record(z.string(), z.union([z.string().transform((val) => [val]), z.array(z.string())])));
const patchedEmojis = {
	"26A0-FE0F": ["warning"],
	"2139-FE0F": ["information_source"]
};
function initMapping(mapping) {
	for (const [hex, shortcodes] of Object.entries(mapping)) {
		const mainShortcode = `:${shortcodes[0]}:`;
		shortCodesByHex.set(hex, mainShortcode);
		shortCodesByHex.set(stripHexCode(hex), mainShortcode);
		for (const shortcode of shortcodes) hexCodesByShort.set(`:${shortcode}:`, hex);
	}
}
function lazyInitMappings() {
	if (!mappingsInitialized) {
		const githubShortcodes = data.get("node_modules/emojibase-data/en/shortcodes/github.json");
		Result.parse(githubShortcodes, EmojiShortcodes).onValue((data) => {
			initMapping(data);
			initMapping(patchedEmojis);
			mappingsInitialized = true;
		}).onError(
			/* istanbul ignore next */
			(err) => {
				logger.warn({ err }, "Unable to parse emoji shortcodes");
			}
		);
	}
}
function setEmojiConfig(config) {
	unicodeEmoji = !!config.unicodeEmoji;
}
const shortCodeRegex = regEx(SHORTCODE_REGEX.source, "g");
function emojify(text) {
	if (!unicodeEmoji) return text;
	lazyInitMappings();
	return text.replace(shortCodeRegex, (shortCode) => {
		const hexCode = hexCodesByShort.get(shortCode);
		return hexCode ? fromCodepointToUnicode(fromHexcodeToCodepoint(hexCode)) : shortCode;
	});
}
const emojiRegexSrc = [emojibaseEmojiRegex, mathiasBynensEmojiRegex()].map((r) => r.source);
const emojiRegex = new RegExp(`(?:${emojiRegexSrc.join("|")})`, "g");
const excludedModifiers = /* @__PURE__ */ new Set([
	"20E3",
	"200D",
	"FE0E",
	"FE0F",
	"1F3FB",
	"1F3FC",
	"1F3FD",
	"1F3FE",
	"1F3FF",
	"1F9B0",
	"1F9B1",
	"1F9B2",
	"1F9B3"
]);
function stripHexCode(input) {
	return input.split("-").filter((modifier) => !excludedModifiers.has(modifier)).join("-");
}
function unemojify(text) {
	if (unicodeEmoji) return text;
	lazyInitMappings();
	return text.replace(emojiRegex, (emoji) => {
		const hexCode = stripHexCode(fromUnicodeToHexcode(emoji));
		const shortCode = shortCodesByHex.get(hexCode);
		return coerceString(shortCode, "�");
	});
}
function stripEmoji(emoji) {
	const hexCode = stripHexCode(fromUnicodeToHexcode(emoji));
	if (hexCode) {
		const codePoint = fromHexcodeToCodepoint(hexCode);
		return fromCodepointToUnicode(codePoint);
	}
	return "";
}
function stripEmojis(input) {
	return input.replace(emojiRegex, stripEmoji);
}
//#endregion
export { emojify, setEmojiConfig, stripEmojis, stripHexCode, unemojify };

//# sourceMappingURL=emoji.js.map