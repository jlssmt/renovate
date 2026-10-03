import { logger } from "../../../../logger/index.js";
import { encodeEntry } from "../codec.js";
import { PackageCacheBase } from "./base.js";
import { isObject } from "@sindresorhus/is";
import { DateTime } from "luxon";
import upath from "upath";
import cacache from "cacache";
//#region lib/util/cache/package/impl/file.ts
var PackageCacheFile = class PackageCacheFile extends PackageCacheBase {
	static create(cacheDir) {
		const cacheFileName = upath.join(cacheDir, "/renovate/renovate-cache-v1");
		logger.debug(`Initializing Renovate internal cache into ${cacheFileName}`);
		return new PackageCacheFile(cacheFileName);
	}
	cacheFileName;
	constructor(cacheFileName) {
		super();
		this.cacheFileName = cacheFileName;
	}
	getKey(namespace, key) {
		return `${namespace}-${key}`;
	}
	async destroy() {
		logger.debug("Checking file package cache for expired items");
		let totalCount = 0;
		let deletedCount = 0;
		let errorCount = 0;
		const startTime = Date.now();
		for await (const item of cacache.ls.stream(this.cacheFileName)) try {
			totalCount += 1;
			const cacheEntry = item;
			if (hasFutureExpiry(cacheEntry.metadata)) continue;
			await cacache.rm.entry(this.cacheFileName, cacheEntry.key);
			await cacache.rm.content(this.cacheFileName, cacheEntry.integrity);
			deletedCount += 1;
		} catch (err) {
			logger.trace({ err }, "Error cleaning up cache entry");
			errorCount += 1;
		}
		if (errorCount > 0) logger.debug(`Error count cleaning up cache: ${errorCount}`);
		const gcStats = await cacache.verify(this.cacheFileName);
		logger.debug(`Cache GC: kept ${gcStats.verifiedContent} content entries (${gcStats.keptSize} bytes), removed ${gcStats.reclaimedCount} orphaned (${gcStats.reclaimedSize} bytes) in ${gcStats.runTime.total}ms`);
		const durationMs = Date.now() - startTime;
		logger.debug(`Deleted ${deletedCount} of ${totalCount} file cached entries in ${durationMs}ms`);
	}
	async readRaw(namespace, key) {
		const cacheKey = this.getKey(namespace, key);
		try {
			const entry = await cacache.get(this.cacheFileName, cacheKey);
			if (hasExpiredMetadata(entry.metadata)) return;
			return entry.data;
		} catch {
			return;
		}
	}
	async writeRaw(namespace, key, data, ttlSeconds) {
		await this.putEntry(this.getKey(namespace, key), data, Date.now() + ttlSeconds * 1e3);
	}
	async rm(namespace, key) {
		logger.trace({
			namespace,
			key
		}, "Removing cache entry");
		await cacache.rm.entry(this.cacheFileName, this.getKey(namespace, key));
	}
	async upgradeLegacyEntry(namespace, key, entry) {
		const { expiry } = entry;
		if (!expiry?.isValid) return;
		try {
			await this.putEntry(this.getKey(namespace, key), await encodeEntry(entry.value, DateTime.local()), expiry.toMillis());
		} catch (err) {
			logger.once.debug({ err }, "Error while upgrading legacy cache entry");
		}
	}
	async putEntry(cacheKey, data, expiry) {
		await cacache.put(this.cacheFileName, cacheKey, data, { metadata: { expiry } });
	}
};
function getMetadataExpiry(metadata) {
	if (!isObject(metadata)) return;
	const { expiry } = metadata;
	return typeof expiry === "number" ? expiry : void 0;
}
function hasExpiredMetadata(metadata) {
	const expiry = getMetadataExpiry(metadata);
	return expiry !== void 0 && Date.now() >= expiry;
}
function hasFutureExpiry(metadata) {
	const expiry = getMetadataExpiry(metadata);
	return expiry !== void 0 && Date.now() < expiry;
}
//#endregion
export { PackageCacheFile };

//# sourceMappingURL=file.js.map