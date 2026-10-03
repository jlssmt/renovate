import { logger } from "../../../../logger/index.js";
import { getCache } from "../../../../util/cache/repository/index.js";
import { DateTime } from "luxon";
//#region lib/workers/repository/update/pr/pr-cache.ts
function getPrCache(branchName) {
	logger.trace(`getPrCache()`);
	const prCache = (getCache().branches?.find((branch) => branchName === branch.branchName))?.prCache;
	if (!prCache) return null;
	// istanbul ignore if
	if (prCache.fingerprint) {
		prCache.bodyFingerprint = prCache.fingerprint;
		delete prCache.fingerprint;
	}
	return prCache;
}
function setPrCache(branchName, bodyFingerprint, prModified) {
	logger.debug(`setPrCache()`);
	const branch = getCache().branches?.find((branch) => branchName === branch.branchName);
	if (!branch) {
		logger.debug(`setPrCache(): Branch cache not present`);
		return;
	}
	const lastEdited = branch.prCache?.lastEdited;
	branch.prCache = {
		bodyFingerprint,
		lastEdited: lastEdited && !prModified ? lastEdited : DateTime.utc().toISO()
	};
}
//#endregion
export { getPrCache, setPrCache };

//# sourceMappingURL=pr-cache.js.map