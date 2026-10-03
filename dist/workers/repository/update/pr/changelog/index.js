import { logger } from "../../../../../logger/index.js";
import { instrument } from "../../../../../instrumentation/index.js";
import { detectPlatform } from "../../../../../util/common.js";
import { ExternalHostError } from "../../../../../types/errors/external-host-error.js";
import { get } from "../../../../../modules/versioning/index.js";
import api from "./api.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/update/pr/changelog/index.ts
async function getChangeLogJSON(config) {
	return await instrument("getChangeLogJSON()", async () => {
		const { sourceUrl, versioning, currentVersion, newVersion } = config;
		try {
			if (!(sourceUrl && currentVersion && newVersion)) return null;
			if (get(versioning).equals(currentVersion, newVersion)) return null;
			logger.debug(`Fetching changelog: ${sourceUrl} (${currentVersion} -> ${newVersion})`);
			const platform = detectPlatform(sourceUrl);
			if (isNullOrUndefined(platform)) {
				logger.info({
					sourceUrl,
					hostType: platform
				}, "Unknown platform, skipping changelog fetching.");
				return null;
			}
			const changeLogSource = getChangeLogSourceFor(platform);
			if (isNullOrUndefined(changeLogSource)) {
				logger.info({
					sourceUrl,
					hostType: platform
				}, "Unknown changelog source, skipping changelog fetching.");
				return null;
			}
			return await changeLogSource.getChangeLogJSON(config);
		} catch (err) {
			if (err instanceof ExternalHostError) logger.warn({
				config,
				err
			}, "getChangeLogJSON error");
			else logger.error({
				config,
				err
			}, "getChangeLogJSON error");
			return null;
		}
	});
}
function getChangeLogSourceFor(platform) {
	return api.get(platform) ?? null;
}
//#endregion
export { getChangeLogJSON, getChangeLogSourceFor };

//# sourceMappingURL=index.js.map