import { logger } from "../../../logger/index.js";
import { HttpCacheStats } from "../../stats.js";
import { copyResponse } from "../util.js";
import { HttpCache } from "./schema.js";
import { DateTime } from "luxon";
//#region lib/util/http/cache/abstract-http-cache-provider.ts
var AbstractHttpCacheProvider = class {
	async get(method, url) {
		const cache = await this.load(method, url);
		const httpCache = HttpCache.parse(cache);
		if (!httpCache) return null;
		httpCache.httpResponse.cached = true;
		return httpCache;
	}
	async setCacheHeaders(method, url, opts) {
		const httpCache = await this.get(method, url);
		if (!httpCache) return;
		opts.headers ??= {};
		if (httpCache.etag) opts.headers["If-None-Match"] = httpCache.etag;
		if (httpCache.lastModified) opts.headers["If-Modified-Since"] = httpCache.lastModified;
	}
	// v8 ignore next -- TODO: add test #40625
	bypassServer(_method, _url, _ignoreSoftTtl) {
		return Promise.resolve(null);
	}
	async wrapServerResponse(method, url, resp) {
		if (!resp.cached && resp.statusCode === 200) {
			const etag = resp.headers?.etag;
			const lastModified = resp.headers?.["last-modified"];
			HttpCacheStats.incRemoteMisses(url);
			const httpResponse = copyResponse(resp, true);
			const timestamp = DateTime.utc().toISO();
			const newHttpCache = HttpCache.parse({
				etag,
				lastModified,
				httpResponse,
				timestamp
			});
			/* v8 ignore next: should never happen */
			if (!newHttpCache) {
				logger.debug(`http cache: failed to persist cache for ${url}`);
				return resp;
			}
			logger.debug(`http cache: saving ${url} (etag=${etag}, lastModified=${lastModified})`);
			await this.persist(method, url, newHttpCache);
			return resp;
		}
		if (resp.statusCode === 304) {
			const httpCache = await this.get(method, url);
			if (!httpCache) return resp;
			const timestamp = httpCache.timestamp;
			logger.debug(`http cache: Using cached response: ${url} from ${timestamp}`);
			httpCache.timestamp = DateTime.utc().toISO();
			await this.persist(method, url, httpCache);
			HttpCacheStats.incRemoteHits(url);
			const cachedResp = copyResponse(httpCache.httpResponse, true);
			cachedResp.authorization = resp.authorization;
			return cachedResp;
		}
		return resp;
	}
};
//#endregion
export { AbstractHttpCacheProvider };

//# sourceMappingURL=abstract-http-cache-provider.js.map