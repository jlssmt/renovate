import { getEnv } from "../../env.js";
import { instrument } from "../../../instrumentation/index.js";
import { PackageCacheFile } from "./impl/file.js";
import { PackageCacheRedis } from "./impl/redis.js";
import { PackageCacheSqlite } from "./impl/sqlite.js";
//#region lib/util/cache/package/backend.ts
let cacheProxy;
let cacheType;
function getCacheType() {
	return cacheType;
}
async function init(config) {
	await destroy();
	await instrument("init PackageCache", async () => {
		if (config.redisUrl) {
			cacheProxy = await PackageCacheRedis.create(config.redisUrl, config.redisPrefix);
			cacheType = "redis";
			return;
		}
		if (getEnv().RENOVATE_X_SQLITE_PACKAGE_CACHE && config.cacheDir) {
			cacheProxy = await PackageCacheSqlite.create(config.cacheDir);
			cacheType = "sqlite";
			return;
		}
		if (config.cacheDir) {
			cacheProxy = PackageCacheFile.create(config.cacheDir);
			cacheType = "file";
			return;
		}
	});
}
async function get(namespace, key) {
	return await cacheProxy?.get(namespace, key);
}
async function set(namespace, key, value, hardTtlMinutes) {
	await cacheProxy?.set(namespace, key, value, hardTtlMinutes);
}
async function destroy() {
	await instrument("destroy PackageCache", async () => {
		cacheType = void 0;
		try {
			await cacheProxy?.destroy();
		} finally {
			cacheProxy = void 0;
		}
	});
}
//#endregion
export { destroy, get, getCacheType, init, set };

//# sourceMappingURL=backend.js.map