import { regEx } from "../regex.js";
import { HttpBase } from "./http.js";
import { isArray, isPlainObject } from "@sindresorhus/is";
//#region lib/util/http/gitea.ts
let baseUrl;
function setBaseUrl(newBaseUrl) {
	baseUrl = newBaseUrl.replace(regEx(/\/*$/), "/");
}
function getPaginationContainer(body) {
	if (isArray(body) && body.length) return body;
	if (isPlainObject(body) && isArray(body?.data) && body.data.length) return body.data;
	return null;
}
var GiteaHttp = class extends HttpBase {
	get baseUrl() {
		return baseUrl;
	}
	constructor(hostType, options) {
		super(hostType ?? "gitea", options);
	}
	extraOptions() {
		return super.extraOptions().concat(["paginate"]);
	}
	async requestJsonUnsafe(method, options) {
		const resolvedUrl = this.resolveUrl(options.url, options.httpOptions);
		const opts = {
			...options,
			url: resolvedUrl
		};
		const res = await super.requestJsonUnsafe(method, opts);
		const pc = getPaginationContainer(res.body);
		if (opts.httpOptions?.paginate && pc) {
			delete opts.httpOptions.cacheProvider;
			opts.httpOptions.memCache = false;
			delete opts.httpOptions.paginate;
			const total = parseInt(res.headers["x-total-count"], 10);
			let nextPage = parseInt(resolvedUrl.searchParams.get("page") ?? "1", 10);
			while (total && pc.length < total) {
				nextPage += 1;
				resolvedUrl.searchParams.set("page", nextPage.toString());
				const nextPc = getPaginationContainer((await super.requestJsonUnsafe(method, opts)).body);
				if (nextPc === null) break;
				pc.push(...nextPc);
			}
		}
		return res;
	}
};
//#endregion
export { GiteaHttp, setBaseUrl };

//# sourceMappingURL=gitea.js.map