import { GlobalConfig } from "../../../config/global.js";
import { parseUrl, trimTrailingSlash } from "../../../util/url.js";
import { acquireLock } from "../../../util/mutex.js";
import { get, set } from "../../../util/cache/package/index.js";
import { isPublicGoPackage } from "./common.js";
import { VersionTimestamps } from "./schema.js";
//#region lib/modules/datasource/go/timestamp-cache.ts
const cacheNamespace = "datasource-go-proxy-timestamps";
const ttlMinutes = 144e3;
/**
* The publication times we already know for a module, so that a run only fetches the `.info` file of a version it has never seen before.
*
* This is intentionally separate from the Go module's releases cache, as the current releases list changes (somewhat frequently), whereas the release timestamp for a given Go module shouldn't change after publication.
*/
var GoVersionTimestampCache = class GoVersionTimestampCache {
	isChanged = false;
	cacheKey;
	timestamps;
	constructor(cacheKey, timestamps) {
		this.cacheKey = cacheKey;
		this.timestamps = timestamps;
	}
	static async init(baseUrl, packageName) {
		const cacheKey = getCacheKey(baseUrl, packageName);
		if (!cacheKey) return new GoVersionTimestampCache(null, {});
		return new GoVersionTimestampCache(cacheKey, await read(cacheKey));
	}
	get(version) {
		return this.timestamps[version];
	}
	set(version, timestamp) {
		this.timestamps[version] = timestamp;
		this.isChanged = true;
	}
	async save() {
		if (!this.cacheKey || !this.isChanged) return;
		const releaseLock = await acquireLock(this.cacheKey, cacheNamespace);
		try {
			const current = await read(this.cacheKey);
			await set(cacheNamespace, this.cacheKey, {
				...current,
				...this.timestamps
			}, ttlMinutes);
		} finally {
			releaseLock();
		}
	}
};
async function read(cacheKey) {
	const cached = await get(cacheNamespace, cacheKey);
	return cached ? VersionTimestamps.parse(cached) : {};
}
/**
* Timestamps are only shared between modules served by the same proxy, and only stored at all for modules we may cache.
*
* Any credentials in the proxy URL are left out, as the key is stored as-is by the cache backends.
*/
function getCacheKey(baseUrl, packageName) {
	if (!GlobalConfig.get("cachePrivatePackages") && !isPublicGoPackage(packageName)) return null;
	const parsedUrl = parseUrl(baseUrl);
	if (!parsedUrl) return null;
	return `${`${parsedUrl.origin}${trimTrailingSlash(parsedUrl.pathname)}`}@@${packageName}`;
}
//#endregion
export { GoVersionTimestampCache };

//# sourceMappingURL=timestamp-cache.js.map