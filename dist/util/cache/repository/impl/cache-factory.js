import { logger } from "../../../../logger/index.js";
import { RepoCacheLocal } from "./local.js";
import { RepoCacheS3 } from "./s3.js";
//#region lib/util/cache/repository/impl/cache-factory.ts
var CacheFactory = class {
	static get(repository, repoFingerprint, cacheType) {
		switch (cacheType.split("://")[0].trim().toLowerCase()) {
			case "local": return new RepoCacheLocal(repository, repoFingerprint);
			case "s3": return new RepoCacheS3(repository, repoFingerprint, cacheType);
			default:
				logger.warn({ cacheType }, `Repository cache type not supported using type "local" instead`);
				return new RepoCacheLocal(repository, repoFingerprint);
		}
	}
};
//#endregion
export { CacheFactory };

//# sourceMappingURL=cache-factory.js.map