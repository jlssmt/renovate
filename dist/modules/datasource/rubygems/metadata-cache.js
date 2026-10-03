import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { toSha256 } from "../../../util/hash.js";
import { get, set } from "../../../util/cache/package/index.js";
import { Result } from "../../../util/result.js";
import { getV1Releases } from "./common.js";
//#region lib/modules/datasource/rubygems/metadata-cache.ts
function hashVersions(versions) {
	return toSha256(versions.sort().join(","));
}
function hashReleases(releases) {
	return hashVersions(releases.releases.map((release) => {
		const platform = release.constraints?.platform?.[0];
		if (platform && platform !== "ruby") return `${release.version}-${platform}`;
		return release.version;
	}));
}
var MetadataCache = class {
	http;
	constructor(http) {
		this.http = http;
	}
	async getRelease(registryUrl, packageName, versions) {
		const cacheNs = `datasource-rubygems`;
		const cacheKey = `metadata-cache:${registryUrl}:${packageName}`;
		const versionsHash = hashVersions(versions);
		function loadCache() {
			return Result.wrapNullable(get(cacheNs, cacheKey), { type: "cache-not-found" }).transform((cache) => {
				return versionsHash === cache.hash ? Result.ok(cache.data) : Result.err({
					type: "cache-stale",
					cache
				});
			});
		}
		async function saveCache(cache, ttlMinutes = 144e3, ttlDelta = 14400) {
			// v8 ignore else -- needs a save against a non-rubygems.org host
			if (parseUrl(registryUrl)?.hostname === "rubygems.org") {
				const ttl = ttlMinutes + Math.floor(Math.random() * ttlDelta);
				await set(cacheNs, cacheKey, cache, ttl);
			}
		}
		return await loadCache().catch((err) => getV1Releases(this.http, registryUrl, packageName).transform(async (data) => {
			const dataHash = hashReleases(data);
			if (dataHash === versionsHash) {
				await saveCache({
					hash: dataHash,
					data
				});
				return Result.ok(data);
			}
			/**
			* Return stale cache for 24 hours,
			* if metadata is inconsistent with versions list.
			*/
			if (err.type === "cache-stale") {
				const staleCache = err.cache;
				// v8 ignore else -- needs a stale cache already marked fallback
				if (!staleCache.isFallback) await saveCache({
					...staleCache,
					isFallback: true
				}, 1440, 0);
				return Result.ok(staleCache.data);
			}
			return Result.err({ type: "cache-invalid" });
		})).catch((err) => {
			logger.debug({ err }, "Rubygems: error fetching rubygems data, falling back to versions-only result");
			const releases = versions.map((version) => ({ version }));
			return Result.ok({ releases });
		}).unwrapOrThrow();
	}
};
//#endregion
export { MetadataCache };

//# sourceMappingURL=metadata-cache.js.map