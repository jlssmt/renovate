import { regEx } from "../../../util/regex.js";
import { isString } from "@sindresorhus/is";
import ini from "ini";
//#region lib/modules/manager/npm/npmrc-parser.ts
/**
* Follow `ini.parse`: indented section-like lines are settings, not sections.
*/
const npmrcSectionRegex = regEx(/^\[(?<section>[^\]]*)\]\s*$/);
const npmrcSettingRegex = regEx(/^(?<key>[^=]+)(?:=(?<value>.*))?$/);
/**
* Reuse `ini.parse`'s token decoder while retaining raw lines for lossless
* rendering.
*
* `@types/ini` declares a string result, but single-quoted JSON literals can
* decode to other types, so callers must narrow it.
*/
function decodeNpmrcText(raw) {
	return ini.unsafe(raw);
}
function decodeNpmrcValue(raw) {
	const value = decodeNpmrcText(raw);
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;
	return value;
}
function parseNpmrcKey(decodedKey) {
	if (!decodedKey.endsWith("[]")) return {
		key: decodedKey,
		isArray: false
	};
	if (decodedKey === "[]") return {
		key: decodedKey,
		isArray: false
	};
	return {
		key: decodedKey.slice(0, -2),
		isArray: true
	};
}
function parseNpmrcLine(raw, lineEnding, section) {
	const trimmed = raw.trim();
	if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) return {
		type: "other",
		raw,
		lineEnding
	};
	const rawSectionName = npmrcSectionRegex.exec(raw)?.groups?.section;
	if (rawSectionName !== void 0) {
		const sectionName = decodeNpmrcText(rawSectionName);
		if (!isString(sectionName)) return {
			type: "other",
			raw,
			lineEnding
		};
		return {
			type: "section",
			name: sectionName,
			raw,
			lineEnding
		};
	}
	const setting = npmrcSettingRegex.exec(raw)?.groups;
	if (!setting) return {
		type: "other",
		raw,
		lineEnding
	};
	const decodedKey = decodeNpmrcText(setting.key);
	if (!isString(decodedKey)) return {
		type: "other",
		raw,
		lineEnding
	};
	const { key, isArray } = parseNpmrcKey(decodedKey);
	let value = true;
	if (setting.value !== void 0) value = decodeNpmrcValue(setting.value);
	return {
		type: "setting",
		section,
		key,
		isArray,
		value,
		raw,
		lineEnding
	};
}
function parseNpmrc(content) {
	const lines = [];
	let detectedLineEnding = null;
	let section = null;
	const parts = content.split(regEx(/(\r\n|\r|\n)/));
	for (let index = 0; index < parts.length; index += 2) {
		const raw = parts[index];
		const lineEnding = parts[index + 1] ?? "";
		if (!raw && !lineEnding) continue;
		if (lineEnding && !detectedLineEnding) detectedLineEnding = lineEnding;
		const line = parseNpmrcLine(raw, lineEnding, section);
		lines.push(line);
		if (line.type === "section") section = line.name;
	}
	return {
		lines,
		detectedLineEnding,
		trailingLineEnding: lines.at(-1)?.lineEnding ?? ""
	};
}
function renderNpmrc(lines) {
	return lines.map((line) => `${line.raw}${line.lineEnding}`).join("");
}
//#endregion
export { parseNpmrc, renderNpmrc };

//# sourceMappingURL=npmrc-parser.js.map