import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { instrument } from "../../../instrumentation/index.js";
import { RepoCacheNull } from "./impl/null.js";
//#region lib/util/cache/repository/index.ts
let repoCache = new RepoCacheNull();
function resetCache() {
	setCache(new RepoCacheNull());
}
function setCache(cache) {
	repoCache = cache;
}
function getCache() {
	return repoCache.getData();
}
async function saveCache() {
	if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would save repository cache.`);
	else await instrument("save RepoCache", () => repoCache.save());
}
function isCacheModified() {
	return repoCache.isModified();
}
//#endregion
export { getCache, isCacheModified, resetCache, saveCache, setCache };

//# sourceMappingURL=index.js.map