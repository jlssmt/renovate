import { logger } from "../../../../logger/index.js";
import { cachePathExists, outputCacheFile, readCacheFile } from "../../../fs/index.js";
import { getLocalCacheFileName } from "../common.js";
import { RepoCacheBase } from "./base.js";
//#region lib/util/cache/repository/impl/local.ts
var RepoCacheLocal = class extends RepoCacheBase {
	constructor(repository, fingerprint) {
		super(repository, fingerprint);
	}
	async read() {
		const cacheFileName = this.getCacheFileName();
		try {
			if (!await cachePathExists(cacheFileName)) return null;
			return await readCacheFile(cacheFileName, "utf8");
		} catch (err) {
			logger.debug({
				err,
				cacheFileName
			}, "Repository local cache not found");
		}
		return null;
	}
	async write(data) {
		const cacheFileName = this.getCacheFileName();
		await outputCacheFile(cacheFileName, JSON.stringify(data));
	}
	getCacheFileName() {
		return getLocalCacheFileName(this.platform, this.repository);
	}
};
//#endregion
export { RepoCacheLocal };

//# sourceMappingURL=local.js.map