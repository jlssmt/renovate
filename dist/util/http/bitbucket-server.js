import { HttpBase } from "./http.js";
import { isArray, isNonEmptyObject } from "@sindresorhus/is";
//#region lib/util/http/bitbucket-server.ts
const MAX_LIMIT = 100;
const MAX_PAGES = 100;
let baseUrl;
function setBaseUrl(url) {
	baseUrl = url;
}
var BitbucketServerHttp = class extends HttpBase {
	get baseUrl() {
		return baseUrl;
	}
	constructor(type = "bitbucket-server", options) {
		super(type, options);
	}
	extraOptions() {
		return super.extraOptions().concat([
			"paginate",
			"limit",
			"maxPages"
		]);
	}
	async requestJsonUnsafe(method, options) {
		const resolvedUrl = this.resolveUrl(options.url, options.httpOptions);
		const opts = {
			...options,
			url: resolvedUrl
		};
		opts.httpOptions ??= {};
		opts.httpOptions.headers ??= {};
		opts.httpOptions.headers["X-Atlassian-Token"] = "no-check";
		const paginate = opts.httpOptions.paginate;
		if (paginate) {
			const limit = opts.httpOptions.limit ?? MAX_LIMIT;
			resolvedUrl.searchParams.set("limit", limit.toString());
		}
		const result = await super.requestJsonUnsafe(method, opts);
		if (paginate && isPagedResult(result.body)) {
			// v8 ignore else -- TODO: add test #40625
			if (opts.httpOptions) {
				delete opts.httpOptions.cacheProvider;
				opts.httpOptions.memCache = false;
			}
			const collectedValues = [...result.body.values];
			let nextPageStart = result.body.nextPageStart;
			let maxPages = opts.httpOptions.maxPages ?? MAX_PAGES;
			while (nextPageStart && --maxPages > 0) {
				resolvedUrl.searchParams.set("start", nextPageStart.toString());
				const nextResult = await super.requestJsonUnsafe(method, opts);
				collectedValues.push(...nextResult.body.values);
				nextPageStart = nextResult.body.nextPageStart;
			}
			return {
				...result,
				body: collectedValues
			};
		}
		return result;
	}
};
function isPagedResult(obj) {
	return isNonEmptyObject(obj) && isArray(obj.values);
}
//#endregion
export { BitbucketServerHttp, setBaseUrl };

//# sourceMappingURL=bitbucket-server.js.map