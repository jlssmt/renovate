import { instrument } from "../../../instrumentation/index.js";
import { RepoCacheNull } from "./impl/null.js";
import { resetCache, setCache } from "./index.js";
import { CacheFactory } from "./impl/cache-factory.js";
//#region lib/util/cache/repository/init.ts
/**
* Extracted to separate file in order to avoid circular module dependencies.
*/
async function initRepoCache(config) {
	resetCache();
	const { repository, repositoryCache, repositoryCacheType: type = "local", repoFingerprint } = config;
	if (repositoryCache === "disabled") {
		setCache(new RepoCacheNull());
		return;
	}
	if (repositoryCache === "enabled") {
		const cache = CacheFactory.get(repository, repoFingerprint, type);
		await instrument("load RepoCache", () => cache.load());
		setCache(cache);
		return;
	}
	if (repositoryCache === "reset") {
		const cache = CacheFactory.get(repository, repoFingerprint, type);
		await instrument("save RepoCache", () => cache.save());
		setCache(cache);
		return;
	}
}
//#endregion
export { initRepoCache };

//# sourceMappingURL=init.js.map