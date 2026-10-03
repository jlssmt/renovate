import { logger } from "../../../logger/index.js";
import { getCache } from "../../../util/cache/repository/index.js";
//#region lib/workers/repository/reconfigure/reconfigure-cache.ts
function setReconfigureBranchCache(reconfigureBranchSha, isConfigValid, extractionSucceeded) {
	const cache = getCache();
	const reconfigureBranchCache = {
		reconfigureBranchSha,
		isConfigValid,
		...extractionSucceeded && { extractionSucceeded }
	};
	if (cache.reconfigureBranchCache) {
		logger.debug({
			reconfigureBranchSha,
			isConfigValid
		}, "Update reconfigure branch cache");
		logger.trace({ reconfigureBranchCache }, "Update reconfigure branch cache");
	} else {
		logger.debug({
			reconfigureBranchSha,
			isConfigValid
		}, "Create reconfigure branch cache");
		logger.trace({ reconfigureBranchCache }, "Create reconfigure branch cache");
	}
	cache.reconfigureBranchCache = reconfigureBranchCache;
}
function deleteReconfigureBranchCache() {
	const cache = getCache();
	if (cache?.reconfigureBranchCache) {
		logger.debug("Delete reconfigure branch cache");
		delete cache.reconfigureBranchCache;
	}
}
//#endregion
export { deleteReconfigureBranchCache, setReconfigureBranchCache };

//# sourceMappingURL=reconfigure-cache.js.map