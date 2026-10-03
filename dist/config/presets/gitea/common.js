import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { PRESET_DEP_NOT_FOUND, PRESET_INVALID, fetchPreset, parsePreset } from "../util.js";
import { getRepoFile } from "../../../modules/platform/gitea/files.js";
import { API_PATH } from "../../../modules/platform/gitea/utils.js";
//#region lib/config/presets/gitea/common.ts
/**
* Builds the preset source of a platform which speaks the Gitea API.
*
* Forgejo is a fork of Gitea and serves the same contents API, so the Gitea
* and Forgejo sources only differ in their Http client and default endpoint.
*/
function createPresetSource(http, defaultEndpoint) {
	async function fetchJSONFile(repo, fileName, endpoint, tag) {
		let res;
		try {
			res = await getRepoFile(http, repo, fileName, tag, { baseUrl: joinUrlParts(endpoint, API_PATH) });
		} catch (err) {
			if (err instanceof ExternalHostError) throw err;
			logger.debug(`Preset file ${fileName} not found in ${repo}: ${err.message}`);
			throw new Error(PRESET_DEP_NOT_FOUND);
		}
		let contentString;
		if (res.type === "file") contentString = res.contentString;
		else {
			logger.debug(`Preset ${fileName} has unexpected type '${res.type}'. Only \`file\` is supported`);
			throw new Error(PRESET_INVALID);
		}
		return parsePreset(contentString, fileName);
	}
	function getPresetFromEndpoint(repo, filePreset, presetPath, endpoint = defaultEndpoint, tag) {
		return fetchPreset({
			repo,
			filePreset,
			presetPath,
			endpoint,
			tag,
			fetch: fetchJSONFile
		});
	}
	function getPreset({ repo, presetName = "default", presetPath, tag }) {
		return getPresetFromEndpoint(repo, presetName, presetPath, defaultEndpoint, tag);
	}
	return {
		fetchJSONFile,
		getPresetFromEndpoint,
		getPreset
	};
}
//#endregion
export { createPresetSource };

//# sourceMappingURL=common.js.map