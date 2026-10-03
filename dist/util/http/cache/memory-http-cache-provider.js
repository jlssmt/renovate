import { get, set } from "../../cache/memory/index.js";
import { clone } from "../../clone.js";
import { AbstractHttpCacheProvider } from "./abstract-http-cache-provider.js";
//#region lib/util/http/cache/memory-http-cache-provider.ts
var MemoryHttpCacheProvider = class extends AbstractHttpCacheProvider {
	cacheKey(method, url) {
		return `memory-cache-http-provider:${method}:${url}`;
	}
	load(method, url) {
		const data = get(this.cacheKey(method, url));
		const cloned = clone(data);
		return Promise.resolve(cloned);
	}
	persist(method, url, data) {
		set(this.cacheKey(method, url), data);
		return Promise.resolve();
	}
	async bypassServer(method, url) {
		const cached = await this.get(method, url);
		if (!cached) return null;
		return cached.httpResponse;
	}
};
const memCacheProvider = new MemoryHttpCacheProvider();
//#endregion
export { MemoryHttpCacheProvider, memCacheProvider };

//# sourceMappingURL=memory-http-cache-provider.js.map