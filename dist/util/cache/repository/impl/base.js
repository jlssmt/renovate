import { GlobalConfig } from "../../../../config/global.js";
import { safeStringify } from "../../../stringify.js";
import { logger } from "../../../../logger/index.js";
import { hash } from "../../../hash.js";
import { compressToBase64, decompressFromBase64 } from "../../../compress.js";
import "../common.js";
import { cleanupHttpCache } from "../http-cache.js";
import { RepoCacheRecord } from "../schema.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
//#region lib/util/cache/repository/impl/base.ts
var RepoCacheBase = class RepoCacheBase {
	platform = GlobalConfig.get("platform");
	oldHash = null;
	data = {};
	repository;
	fingerprint;
	constructor(repository, fingerprint) {
		this.repository = repository;
		this.fingerprint = fingerprint;
	}
	static parseData(input) {
		const data = JSON.parse(input);
		// istanbul ignore next
		if (data.branches) {
			for (const branch of data.branches) if (branch.branchFingerprint) {
				branch.commitFingerprint = branch.branchFingerprint;
				delete branch.branchFingerprint;
			}
		}
		return data;
	}
	async restore(oldCache) {
		if (oldCache.fingerprint !== this.fingerprint) {
			logger.debug("Repository cache fingerprint is invalid");
			return;
		}
		const jsonStr = await decompressFromBase64(oldCache.payload);
		this.data = RepoCacheBase.parseData(jsonStr);
		this.oldHash = oldCache.hash;
	}
	async load() {
		try {
			const oldCache = await this.read();
			if (!isString(oldCache)) {
				logger.debug(`RepoCacheBase.load() - expecting data of type 'string' received '${typeof oldCache}' instead - skipping`);
				return;
			}
			if (!isNonEmptyString(oldCache)) {
				logger.debug("RepoCacheBase.load() - cache file is empty - skipping");
				return;
			}
			const cacheV13 = RepoCacheRecord.safeParse(oldCache);
			if (cacheV13.success) {
				await this.restore(cacheV13.data);
				logger.debug("Repository cache is restored from revision 13");
				return;
			}
			logger.warn({ err: cacheV13.error }, "Repository cache is invalid");
		} catch (err) /* istanbul ignore next: not easily testable */ {
			logger.debug({ err }, "Error reading repository cache");
		}
	}
	async save() {
		cleanupHttpCache(this.data);
		const jsonStr = safeStringify(this.data);
		const hashedJsonStr = hash(jsonStr);
		if (hashedJsonStr === this.oldHash) return;
		const revision = 13;
		const repository = this.repository;
		const fingerprint = this.fingerprint;
		const payload = await compressToBase64(jsonStr);
		await this.write({
			revision,
			repository,
			fingerprint,
			payload,
			hash: hashedJsonStr
		});
	}
	getData() {
		return this.data;
	}
	isModified() {
		if (!this.oldHash) return;
		const jsonStr = safeStringify(this.data);
		return hash(jsonStr) !== this.oldHash;
	}
};
//#endregion
export { RepoCacheBase };

//# sourceMappingURL=base.js.map