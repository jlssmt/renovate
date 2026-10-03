import { get, set } from "../../cache/memory/index.js";
import { copyResponse } from "../util.js";
import { getCache } from "../../cache/repository/index.js";
import { AbstractHttpCacheProvider } from "./abstract-http-cache-provider.js";
//#region lib/util/http/cache/repository-http-cache-provider.ts
var RepositoryHttpCacheProvider = class extends AbstractHttpCacheProvider {
	aggressive;
	constructor(aggressive = false) {
		super();
		this.aggressive = aggressive;
	}
	load(method, url) {
		const cache = getCache();
		if (method === "head") {
			cache.httpCacheHead ??= {};
			return Promise.resolve(cache.httpCacheHead[url]);
		}
		cache.httpCache ??= {};
		return Promise.resolve(cache.httpCache[url]);
	}
	persist(method, url, data) {
		const cache = getCache();
		if (method === "head") {
			cache.httpCacheHead ??= {};
			cache.httpCacheHead[url] = data;
			return Promise.resolve();
		}
		cache.httpCache ??= {};
		cache.httpCache[url] = data;
		return Promise.resolve();
	}
	getSyncFlags() {
		let flags = get("repo-cache-flags");
		if (!flags) {
			flags = {};
			set("repo-cache-flags", flags);
		}
		return flags;
	}
	isSynced(method, url) {
		if (!this.aggressive) return false;
		return !!this.getSyncFlags()[`${method}:${url}`];
	}
	markSynced(method, url, value = true) {
		const flags = this.getSyncFlags();
		flags[`${method}:${url}`] = value;
	}
	wrapServerResponse(method, url, resp) {
		const res = super.wrapServerResponse(method, url, resp);
		this.markSynced(method, url);
		return res;
	}
	async bypassServer(method, url, _ignoreSoftTtl) {
		if (!this.isSynced(method, url)) return null;
		const httpCache = await this.get(method, url);
		if (!httpCache) return null;
		return copyResponse(httpCache.httpResponse, true);
	}
};
const repoCacheProvider = new RepositoryHttpCacheProvider();
/**
* This is useful when you use `memCacheProvider`,
* but want the values be persisted for longer time.
*/
const aggressiveRepoCacheProvider = new RepositoryHttpCacheProvider(true);
//#endregion
export { RepositoryHttpCacheProvider, aggressiveRepoCacheProvider, repoCacheProvider };

//# sourceMappingURL=repository-http-cache-provider.js.map