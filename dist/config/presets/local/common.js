import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { PRESET_DEP_NOT_FOUND, fetchPreset, parsePreset } from "../util.js";
//#region lib/config/presets/local/common.ts
var common_exports = /* @__PURE__ */ __exportAll({
	fetchJSONFile: () => fetchJSONFile,
	getPresetFromEndpoint: () => getPresetFromEndpoint
});
async function fetchJSONFile(repo, fileName, _endpoint, tag) {
	const { platform } = await import("../../../modules/platform/index.js");
	let raw;
	try {
		raw = await platform.getRawFile(fileName, repo, tag ?? void 0);
	} catch (err) {
		if (err instanceof ExternalHostError) throw err;
		logger.debug(`Preset file ${fileName} not found in ${repo}: ${err.message}}`);
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	if (!raw) throw new Error(PRESET_DEP_NOT_FOUND);
	return parsePreset(raw, fileName);
}
function getPresetFromEndpoint(repo, filePreset, presetPath, endpoint, tag) {
	return fetchPreset({
		repo,
		filePreset,
		presetPath,
		endpoint,
		tag,
		fetch: fetchJSONFile
	});
}
//#endregion
export { common_exports, fetchJSONFile, getPresetFromEndpoint };

//# sourceMappingURL=common.js.map