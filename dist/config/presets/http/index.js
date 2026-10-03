import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { PRESET_DEP_NOT_FOUND, parsePreset } from "../util.js";
import { Http } from "../../../util/http/index.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
//#region lib/config/presets/http/index.ts
const http = new Http("preset", { responseBecomesConfig: true });
async function getPreset({ repo: url }) {
	const parsedUrl = parseUrl(url);
	let response;
	if (!parsedUrl) {
		logger.debug(`Preset URL ${url} is malformed`);
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	try {
		response = await http.getText(url, { cacheProvider: memCacheProvider });
	} catch (err) {
		if (err instanceof ExternalHostError) throw err;
		if (err.message === "host-blocked") throw err;
		logger.debug(`Preset file ${url} not found: ${err.message}`);
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	return parsePreset(response.body, parsedUrl.pathname);
}
//#endregion
export { getPreset };

//# sourceMappingURL=index.js.map