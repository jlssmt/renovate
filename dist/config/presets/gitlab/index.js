import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { PRESET_DEP_NOT_FOUND, fetchPreset, parsePreset } from "../util.js";
import { GitlabHttp } from "../../../util/http/gitlab.js";
import { getRepoFile } from "../../../modules/platform/gitlab/files.js";
//#region lib/config/presets/gitlab/index.ts
const gitlabApi = new GitlabHttp();
const Endpoint = "https://gitlab.com/api/v4/";
async function fetchJSONFile(repo, fileName, endpoint, tag) {
	let content;
	try {
		content = await getRepoFile(gitlabApi, encodeURIComponent(repo), fileName, tag, { baseUrl: endpoint });
	} catch (err) {
		if (err instanceof ExternalHostError) throw err;
		logger.debug(`Preset file ${fileName} not found in ${repo}: ${err.message}`);
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	return parsePreset(content, fileName);
}
function getPresetFromEndpoint(repo, presetName, presetPath, endpoint = Endpoint, tag) {
	return fetchPreset({
		repo,
		filePreset: presetName,
		presetPath,
		endpoint,
		tag,
		fetch: fetchJSONFile
	});
}
function getPreset({ repo, presetPath, presetName = "default", tag }) {
	return getPresetFromEndpoint(repo, presetName, presetPath, Endpoint, tag);
}
//#endregion
export { Endpoint, fetchJSONFile, getPreset, getPresetFromEndpoint };

//# sourceMappingURL=index.js.map