import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { Result } from "../../../../util/result.js";
import { YarnConfig } from "../schema.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/npm/extract/yarnrc.ts
const registryRegEx = regEx(/^"?(?:@(?<scope>[^:]+):)?registry"? "?(?<registryUrl>[^"]+)"?$/gm);
function loadConfigFromLegacyYarnrc(legacyYarnrc) {
	const registryMatches = [...legacyYarnrc.matchAll(registryRegEx)].map((m) => m.groups).filter(isTruthy);
	const yarnrcConfig = {};
	for (const registryMatch of registryMatches) if (registryMatch.scope) {
		yarnrcConfig.npmScopes ??= {};
		yarnrcConfig.npmScopes[registryMatch.scope] ??= {};
		yarnrcConfig.npmScopes[registryMatch.scope].npmRegistryServer = registryMatch.registryUrl;
	} else yarnrcConfig.npmRegistryServer = registryMatch.registryUrl;
	return yarnrcConfig;
}
function loadConfigFromYarnrcYml(yarnrcYml) {
	return Result.parse(yarnrcYml, YarnConfig).onError((err) => {
		logger.warn({
			yarnrcYml,
			err
		}, `Failed to load yarnrc file`);
	}).unwrapOrNull();
}
function resolveRegistryUrl(packageName, yarnrcConfig) {
	if (yarnrcConfig.npmScopes) {
		for (const scope in yarnrcConfig.npmScopes) if (packageName.startsWith(`@${scope}/`)) return yarnrcConfig.npmScopes[scope].npmRegistryServer ?? null;
	}
	if (yarnrcConfig.npmRegistryServer) return yarnrcConfig.npmRegistryServer;
	return null;
}
//#endregion
export { loadConfigFromLegacyYarnrc, loadConfigFromYarnrcYml, resolveRegistryUrl };

//# sourceMappingURL=yarnrc.js.map