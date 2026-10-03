import { regEx } from "../../util/regex.js";
import { logger } from "../../logger/index.js";
import { ensureTrailingSlash } from "../../util/url.js";
import { parseJson } from "../../util/common.js";
//#region lib/config/presets/util.ts
const PRESET_DEP_NOT_FOUND = "dep not found";
const PRESET_INVALID = "invalid preset";
const PRESET_INVALID_JSON = "invalid preset JSON";
const PRESET_NOT_FOUND = "preset not found";
const PRESET_PROHIBITED_SUBPRESET = "prohibited sub-preset";
const PRESET_RELATIVE_NO_PARENT = "relative preset has no parent";
const PRESET_RELATIVE_OUTSIDE_REPO = "relative preset outside repo";
const PRESET_RENOVATE_CONFIG_NOT_FOUND = "preset renovate-config not found";
async function fetchPreset({ repo, filePreset, presetPath, endpoint: _endpoint, tag, fetch }) {
	const endpoint = ensureTrailingSlash(_endpoint);
	const [fileName, presetName, subPresetName] = filePreset.split("/");
	const pathPrefix = presetPath ? `${presetPath}/` : "";
	function buildFilePath(name) {
		return `${pathPrefix}${name}`;
	}
	let jsonContent;
	if (fileName === "default") try {
		jsonContent = await fetch(repo, buildFilePath("default.json"), endpoint, tag);
	} catch (err) {
		if (err.message !== "dep not found") throw err;
		jsonContent = await fetch(repo, buildFilePath("renovate.json"), endpoint, tag);
		logger.warn({
			repo,
			filePreset,
			presetPath,
			endpoint,
			tag
		}, "Fallback to renovate.json file as a preset is deprecated, please use a default.json file instead.");
	}
	else jsonContent = await fetch(repo, buildFilePath(regEx(/\.json[5c]?$/).test(fileName) ? fileName : `${fileName}.json`), endpoint, tag);
	if (!jsonContent) throw new Error(PRESET_DEP_NOT_FOUND);
	if (presetName) {
		const preset = jsonContent[presetName];
		if (!preset) throw new Error(PRESET_NOT_FOUND);
		if (subPresetName) {
			const subPreset = preset[subPresetName];
			if (!subPreset) throw new Error(PRESET_NOT_FOUND);
			return subPreset;
		}
		return preset;
	}
	return jsonContent;
}
function parsePreset(content, fileName) {
	try {
		return parseJson(content, fileName);
	} catch {
		throw new Error(PRESET_INVALID_JSON);
	}
}
//#endregion
export { PRESET_DEP_NOT_FOUND, PRESET_INVALID, PRESET_INVALID_JSON, PRESET_NOT_FOUND, PRESET_PROHIBITED_SUBPRESET, PRESET_RELATIVE_NO_PARENT, PRESET_RELATIVE_OUTSIDE_REPO, PRESET_RENOVATE_CONFIG_NOT_FOUND, fetchPreset, parsePreset };

//# sourceMappingURL=util.js.map