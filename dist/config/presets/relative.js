import { coerceString } from "../../util/string.js";
import { logger } from "../../logger/index.js";
import { PRESET_RELATIVE_OUTSIDE_REPO } from "./util.js";
import { isRelativePresetReference, parsePreset } from "./parse.js";
import { isArray, isPlainObject, isString } from "@sindresorhus/is";
import upath from "upath";
//#region lib/config/presets/relative.ts
/**
* Keys whose array entries may contain relative preset references.
*/
const presetReferenceKeys = ["extends", "ignorePresets"];
/**
* Converts a relative preset reference into an absolute preset string, by
* inheriting the source, repository and tag of the preset which references it.
*
* For example `./system/registries` found inside `github>some/repo#v2.0.0`
* resolves to `github>some/repo//system/registries#v2.0.0`.
*/
function resolveRelativePreset(input, parent) {
	const parsed = parsePreset(input);
	let resolved;
	if (parsed.presetName.startsWith("/")) resolved = upath.normalize(parsed.presetName.slice(1));
	else resolved = upath.normalize(upath.join(coerceString(parent.presetPath), parsed.presetName));
	if (resolved === ".." || resolved.startsWith("../")) throw new Error(PRESET_RELATIVE_OUTSIDE_REPO);
	const tag = parent.tag ? `#${parent.tag}` : "";
	const params = isString(parsed.rawParams) ? `(${parsed.rawParams})` : "";
	if (resolved === "default") return `${parent.presetSource}>${parent.repo}${tag}${params}`;
	return `${parent.presetSource}>${parent.repo}//${resolved}${tag}${params}`;
}
/**
* Rewrites every relative preset reference found in any `extends` or
* `ignorePresets` array of the given value into an absolute preset string.
* The value is mutated in place.
*/
function canonicalizeRelativePresets(value, parent) {
	if (isArray(value)) {
		for (const element of value) canonicalizeRelativePresets(element, parent);
		return;
	}
	if (!isPlainObject(value)) return;
	for (const [key, val] of Object.entries(value)) {
		if (presetReferenceKeys.includes(key) && isArray(val)) {
			value[key] = val.map((entry) => rewritePresetEntry(entry, parent));
			continue;
		}
		canonicalizeRelativePresets(val, parent);
	}
}
function rewritePresetEntry(entry, parent) {
	if (!isString(entry) || !isRelativePresetReference(entry)) return entry;
	if ((entry.includes("(") ? entry.slice(0, entry.indexOf("(")) : entry).includes("{{")) return entry;
	try {
		return resolveRelativePreset(entry, parent);
	} catch (err) {
		logger.warn({
			preset: entry,
			parentPreset: parent,
			err
		}, "Could not resolve relative preset reference");
		return entry;
	}
}
//#endregion
export { canonicalizeRelativePresets };

//# sourceMappingURL=relative.js.map