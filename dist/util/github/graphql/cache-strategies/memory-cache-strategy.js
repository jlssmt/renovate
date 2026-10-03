import { get, set } from "../../../cache/memory/index.js";
import { AbstractGithubGraphqlCacheStrategy } from "./abstract-cache-strategy.js";
//#region lib/util/github/graphql/cache-strategies/memory-cache-strategy.ts
/**
* In-memory strategy meant to be used for private packages
* and for testing purposes.
*/
var GithubGraphqlMemoryCacheStrategy = class extends AbstractGithubGraphqlCacheStrategy {
	fullKey() {
		return `github-graphql-cache:${this.cacheNs}:${this.cacheKey}`;
	}
	load() {
		const key = this.fullKey();
		const res = get(key);
		return Promise.resolve(res);
	}
	persist(cacheRecord) {
		const key = this.fullKey();
		set(key, cacheRecord);
		return Promise.resolve();
	}
};
//#endregion
export { GithubGraphqlMemoryCacheStrategy };

//# sourceMappingURL=memory-cache-strategy.js.map