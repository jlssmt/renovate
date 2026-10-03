import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { PRESET_DEP_NOT_FOUND, fetchPreset, parsePreset } from "../util.js";
import { GithubHttp } from "../../../util/http/github.js";
import { repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { getRepoFile } from "../../../modules/platform/github/files.js";
//#region lib/config/presets/github/index.ts
const Endpoint = "https://api.github.com/";
const http = new GithubHttp();
async function fetchJSONFile(repo, fileName, endpoint, tag) {
	let content;
	try {
		content = await getRepoFile(http, repo, fileName, tag, {
			baseUrl: endpoint,
			cacheProvider: repoCacheProvider
		});
	} catch (err) {
		if (err instanceof ExternalHostError) throw err;
		logger.debug(`Preset file ${fileName} not found in ${repo}: ${err.message}`);
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	return parsePreset(content, fileName);
}
function getPresetFromEndpoint(repo, filePreset, presetPath, endpoint = Endpoint, tag) {
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
	return getPresetFromEndpoint(repo, presetName, presetPath, Endpoint, tag);
}
//#endregion
export { Endpoint, fetchJSONFile, getPreset, getPresetFromEndpoint };

//# sourceMappingURL=index.js.map