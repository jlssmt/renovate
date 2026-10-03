import { regEx } from "../../regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { HttpCacheStats } from "../../stats.js";
import { resolveTtlValues } from "../../cache/package/ttl.js";
import { get, setWithRawTtl } from "../../cache/package/index.js";
import { copyResponse } from "../util.js";
import { AbstractHttpCacheProvider } from "./abstract-http-cache-provider.js";
import { isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/util/http/cache/package-http-cache-provider.ts
var PackageHttpCacheProvider = class extends AbstractHttpCacheProvider {
	namespace;
	defaultTtlMinutes;
	writeSchema;
	checkCacheControlHeader;
	checkAuthorizationHeader;
	constructor({ namespace, softTtlMinutes = 15, checkCacheControlHeader, checkAuthorizationHeader, writeSchema }) {
		super();
		this.namespace = namespace;
		this.defaultTtlMinutes = softTtlMinutes;
		this.checkCacheControlHeader = checkCacheControlHeader;
		this.checkAuthorizationHeader = checkAuthorizationHeader;
		this.writeSchema = writeSchema;
	}
	get softTtlMinutes() {
		const { softTtlMinutes } = resolveTtlValues(this.namespace, this.defaultTtlMinutes);
		return softTtlMinutes;
	}
	get hardTtlMinutes() {
		const { hardTtlMinutes } = resolveTtlValues(this.namespace, this.defaultTtlMinutes);
		return hardTtlMinutes;
	}
	cacheKey(method, url) {
		if (method !== "get") return `${method}:${url}`;
		return url;
	}
	async load(method, url) {
		return await get(this.namespace, this.cacheKey(method, url));
	}
	async persist(method, url, data) {
		if (!data) return;
		if (!this.writeSchema) {
			await setWithRawTtl(this.namespace, this.cacheKey(method, url), data, this.hardTtlMinutes);
			return;
		}
		const httpResponse = copyResponse(data.httpResponse, false);
		const { data: body, error: err } = this.writeSchema.safeParse(httpResponse.body);
		if (err) {
			logger.once.debug({
				err,
				method,
				namespace: this.namespace,
				url
			}, "http cache: writeSchema validation failed for response body, skipping cache write");
			return;
		}
		httpResponse.body = body;
		await setWithRawTtl(this.namespace, this.cacheKey(method, url), {
			...data,
			httpResponse
		}, this.hardTtlMinutes);
	}
	async bypassServer(method, url, ignoreSoftTtl = false) {
		const cached = await this.get(method, url);
		if (!cached) return null;
		if (ignoreSoftTtl) return cached.httpResponse;
		const deadline = DateTime.fromISO(cached.timestamp).plus({ minutes: this.softTtlMinutes });
		if (DateTime.now() >= deadline) {
			HttpCacheStats.incLocalMisses(url);
			return null;
		}
		HttpCacheStats.incLocalHits(url);
		return cached.httpResponse;
	}
	cacheAllowed(resp) {
		if (GlobalConfig.get("cachePrivatePackages")) return true;
		if (this.checkCacheControlHeader) {
			const cacheControl = resp.headers["cache-control"];
			if (!(isString(cacheControl) && cacheControl.toLocaleLowerCase().split(regEx(/\s*,\s*/)).includes("public"))) return false;
		}
		if (this.checkAuthorizationHeader && resp.authorization) return false;
		return true;
	}
	async wrapServerResponse(method, url, resp) {
		if (resp.statusCode === 200 && !this.cacheAllowed(resp)) return resp;
		return await super.wrapServerResponse(method, url, resp);
	}
};
//#endregion
export { PackageHttpCacheProvider };

//# sourceMappingURL=package-http-cache-provider.js.map