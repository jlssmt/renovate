import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { acquireLock } from "../../mutex.js";
import { resolveTtlValues } from "./ttl.js";
import { get, setWithRawTtl } from "./index.js";
import { isUndefined } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/util/cache/package/with-cache.ts
/**
* Caches the result of an async function.
*
* @param options - Cache options
* @param fn - The async function to cache
* @returns The cached or fresh result
*/
async function withCache(options, fn) {
	const { namespace, key, ttlMinutes = 30, cacheable = true, fallback = false } = options;
	if (!(GlobalConfig.get("cachePrivatePackages") || cacheable)) return fn();
	function defaultShouldCacheResult(_value) {
		return true;
	}
	const shouldCacheResult = options.shouldCacheResult ?? defaultShouldCacheResult;
	// istanbul ignore if -- TODO: add test #40625
	if (!namespace || !key) return fn();
	const cacheKey = `cache-decorator:${key}`;
	const releaseLock = await acquireLock(cacheKey, namespace);
	try {
		const cachedRecord = await get(namespace, cacheKey);
		const { softTtlMinutes, hardTtlMinutes: resolvedHardTtl } = resolveTtlValues(namespace, ttlMinutes);
		const hardTtlMinutes = fallback ? resolvedHardTtl : softTtlMinutes;
		let fallbackValue;
		if (cachedRecord && shouldCacheResult(cachedRecord.value)) {
			const now = DateTime.local();
			const cachedAt = DateTime.fromISO(cachedRecord.cachedAt);
			if (now < cachedAt.plus({ minutes: softTtlMinutes })) return cachedRecord.value;
			if (now < cachedAt.plus({ minutes: hardTtlMinutes })) fallbackValue = cachedRecord.value;
		}
		let newValue;
		try {
			newValue = await fn();
		} catch (err) {
			if (!isUndefined(fallbackValue)) {
				logger.debug({ err }, "Package cache: callback error, returning stale data");
				return fallbackValue;
			}
			throw err;
		}
		if (!isUndefined(newValue) && shouldCacheResult(newValue)) {
			const newRecord = {
				cachedAt: DateTime.local().toISO(),
				value: newValue
			};
			await setWithRawTtl(namespace, cacheKey, newRecord, hardTtlMinutes);
		}
		return newValue;
	} finally {
		releaseLock();
	}
}
//#endregion
export { withCache };

//# sourceMappingURL=with-cache.js.map