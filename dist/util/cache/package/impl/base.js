import { logger } from "../../../../logger/index.js";
import { decodeEntry, encodeEntry, isEnvelope } from "../codec.js";
import { decodeLegacyEntry } from "../legacy.js";
import { DateTime } from "luxon";
//#region lib/util/cache/package/impl/base.ts
var PackageCacheBase = class {
	async get(namespace, key) {
		let raw;
		try {
			raw = await this.readRaw(namespace, key);
		} catch (err) {
			logger.once.debug({ err }, "Error while reading package cache value");
			return;
		}
		if (!raw) {
			logger.trace({
				namespace,
				key
			}, "Cache miss");
			return;
		}
		try {
			if (isEnvelope(raw)) {
				const entry = await decodeEntry(raw);
				logger.trace({
					namespace,
					key
				}, "Returning cached value");
				return entry.value;
			}
			const entry = await decodeLegacyEntry(raw);
			if (isExpiredLegacyEntry(entry)) {
				await this.removeInvalidEntry(namespace, key);
				return;
			}
			await this.upgradeLegacyEntry(namespace, key, entry);
			logger.trace({
				namespace,
				key
			}, "Returning cached value");
			return entry.value;
		} catch (err) {
			logger.once.debug({ err }, "Error while reading package cache value");
			await this.removeInvalidEntry(namespace, key);
			return;
		}
	}
	async set(namespace, key, value, hardTtlMinutes) {
		logger.trace({
			namespace,
			key,
			hardTtlMinutes
		}, "Saving cached value");
		const ttlSeconds = Math.floor(hardTtlMinutes * 60);
		try {
			if (ttlSeconds <= 0) {
				await this.rm(namespace, key);
				return;
			}
			await this.writeRaw(namespace, key, await encodeEntry(value, DateTime.local()), ttlSeconds);
		} catch (err) {
			logger.once.warn({ err }, "Error while setting package cache value");
		}
	}
	upgradeLegacyEntry(_namespace, _key, _entry) {}
	async removeInvalidEntry(namespace, key) {
		try {
			await this.rm(namespace, key);
		} catch (err) {
			logger.once.debug({ err }, "Error while removing package cache value");
		}
	}
};
function isExpiredLegacyEntry(entry) {
	const { expiry } = entry;
	return expiry !== void 0 && (!expiry.isValid || DateTime.local() >= expiry);
}
//#endregion
export { PackageCacheBase };

//# sourceMappingURL=base.js.map