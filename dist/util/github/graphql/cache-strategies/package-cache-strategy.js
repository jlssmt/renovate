import { get, set } from "../../../cache/package/index.js";
import { AbstractGithubGraphqlCacheStrategy } from "./abstract-cache-strategy.js";
//#region lib/util/github/graphql/cache-strategies/package-cache-strategy.ts
/**
* Package cache strategy meant to be used for public packages.
*/
var GithubGraphqlPackageCacheStrategy = class extends AbstractGithubGraphqlCacheStrategy {
	load() {
		return get(this.cacheNs, this.cacheKey);
	}
	async persist(cacheRecord) {
		const ttlMinutes = this.createdAt.plus({ hours: AbstractGithubGraphqlCacheStrategy.cacheTTLDays * 24 }).toUTC().diff(this.now, ["minutes"]).as("minutes");
		// v8 ignore else -- TODO: add test #40625
		if (ttlMinutes && ttlMinutes > 0) await set(this.cacheNs, this.cacheKey, cacheRecord, ttlMinutes);
	}
};
//#endregion
export { GithubGraphqlPackageCacheStrategy };

//# sourceMappingURL=package-cache-strategy.js.map