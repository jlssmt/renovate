import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { PRESET_DEP_NOT_FOUND, PRESET_NOT_FOUND, PRESET_RENOVATE_CONFIG_NOT_FOUND } from "../util.js";
import { Http } from "../../../util/http/index.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { NpmResponse } from "../../../modules/datasource/npm/schema.js";
import { resolvePackageUrl, resolveRegistryUrl } from "../../../modules/datasource/npm/npmrc.js";
//#region lib/config/presets/npm/index.ts
const http = new Http("npm", { responseBecomesConfig: true });
async function getPreset({ repo: pkg, presetName = "default" }) {
	let dep;
	try {
		const registryUrl = resolveRegistryUrl(pkg);
		logger.once.warn({
			registryUrl,
			pkg
		}, "Using npm packages for Renovate presets is now deprecated. Please migrate to repository-based presets instead.");
		const packageUrl = resolvePackageUrl(registryUrl, pkg);
		const body = (await http.getJson(packageUrl, { cacheProvider: memCacheProvider }, NpmResponse)).body;
		dep = body.versions[body["dist-tags"].latest];
	} catch (err) {
		if (err.message === "host-blocked") throw err;
		throw new Error(PRESET_DEP_NOT_FOUND);
	}
	if (!dep?.["renovate-config"]) throw new Error(PRESET_RENOVATE_CONFIG_NOT_FOUND);
	const presetConfig = dep["renovate-config"][presetName];
	if (!presetConfig) {
		const presetNames = Object.keys(dep["renovate-config"]);
		logger.debug({
			presetNames,
			presetName
		}, "Preset not found within renovate-config");
		throw new Error(PRESET_NOT_FOUND);
	}
	return presetConfig;
}
//#endregion
export { getPreset };

//# sourceMappingURL=index.js.map