import { newlineRegex } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { copystr } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { RequestError } from "../../../util/http/got.js";
import { Result } from "../../../util/result.js";
import "../../../util/http/index.js";
import { getElapsedMinutes } from "../../../util/date.js";
import { DateTime } from "luxon";
import { z } from "zod/v4";
//#region lib/modules/datasource/rubygems/versions-endpoint-cache.ts
function getContentTail(content) {
	return content.slice(-33);
}
function getContentHead(content) {
	return content.slice(0, 33);
}
function stripContentHead(content) {
	return content.slice(33);
}
function reconcilePackageVersions(packageVersions, versionLines) {
	for (const line of versionLines) {
		const packageName = copystr(line.packageName);
		let versions = coerceArray(packageVersions.get(packageName));
		const { deletedVersions, addedVersions } = line;
		if (deletedVersions.size > 0) versions = versions.filter((v) => !deletedVersions.has(v));
		// v8 ignore else -- needs a delta that only removes versions
		if (addedVersions.length > 0) {
			const existingVersions = new Set(versions);
			for (const addedVersion of addedVersions)
 // v8 ignore else -- needs a delta re-adding a version already present
			if (!existingVersions.has(addedVersion)) {
				const version = copystr(addedVersion);
				versions.push(version);
			}
		}
		packageVersions.set(packageName, versions);
	}
	return packageVersions;
}
function parseFullBody(body) {
	const packageVersions = reconcilePackageVersions(/* @__PURE__ */ new Map(), VersionLines.parse(body));
	const syncedAt = DateTime.now().toJSDate();
	const contentLength = body.length;
	const contentTail = getContentTail(body);
	return Result.ok({
		packageVersions,
		syncedAt,
		contentLength,
		contentTail
	});
}
const memCache = /* @__PURE__ */ new Map();
function cacheResult(registryUrl, result) {
	// v8 ignore else -- needs a result cached for a non-rubygems.org host
	if (parseUrl(registryUrl)?.hostname === "rubygems.org") memCache.set(registryUrl, result);
}
const VersionLines = z.string().transform((x) => x.split(newlineRegex)).pipe(LooseArray(z.string().transform((line) => line.trim()).refine((line) => line.length > 0).refine((line) => !line.startsWith("created_at:")).refine((line) => line !== "---").transform((line) => line.split(" ")).pipe(z.tuple([z.string(), z.string()]).rest(z.string())).transform(([packageName, versions]) => {
	const deletedVersions = /* @__PURE__ */ new Set();
	const addedVersions = [];
	for (const version of versions.split(",")) if (version.startsWith("-")) deletedVersions.add(version.slice(1));
	else addedVersions.push(version);
	return {
		packageName,
		deletedVersions,
		addedVersions
	};
})));
function isStale(regCache) {
	return getElapsedMinutes(regCache.syncedAt) >= 15;
}
var VersionsEndpointCache = class {
	http;
	constructor(http) {
		this.http = http;
	}
	cacheRequests = /* @__PURE__ */ new Map();
	/**
	* At any given time, there should only be one request for a given registryUrl.
	*/
	async getCache(registryUrl) {
		const oldResult = memCache.get(registryUrl);
		if (!oldResult) {
			const newResult = await this.fullSync(registryUrl);
			cacheResult(registryUrl, newResult);
			return newResult;
		}
		const { val: data } = oldResult.unwrap();
		if (!data) return oldResult;
		if (isStale(data)) {
			memCache.delete(registryUrl);
			const newResult = await this.deltaSync(data, registryUrl);
			cacheResult(registryUrl, newResult);
			return newResult;
		}
		return oldResult;
	}
	async getVersions(registryUrl, packageName) {
		/**
		* Ensure that only one request for a given registryUrl is in flight at a time.
		*/
		let cacheRequest = this.cacheRequests.get(registryUrl);
		if (!cacheRequest) {
			cacheRequest = this.getCache(registryUrl);
			this.cacheRequests.set(registryUrl, cacheRequest);
		}
		let cachedResult;
		try {
			cachedResult = await cacheRequest;
		} finally {
			this.cacheRequests.delete(registryUrl);
		}
		const { val: cachedData } = cachedResult.unwrap();
		if (!cachedData) {
			logger.debug({
				packageName,
				registryUrl
			}, "Rubygems: endpoint not supported");
			return Result.err("unsupported-api");
		}
		const versions = cachedData.packageVersions.get(packageName);
		if (!versions?.length) {
			logger.debug({
				packageName,
				registryUrl
			}, "Rubygems: versions not found");
			return Result.err("package-not-found");
		}
		return Result.ok(versions);
	}
	async fullSync(registryUrl) {
		try {
			const url = `${registryUrl}/versions`;
			const { body } = await this.http.getText(url, { headers: { "Accept-Encoding": "gzip" } });
			return parseFullBody(body);
		} catch (err) {
			if (err instanceof RequestError && err.response?.statusCode === 404) return Result.err("unsupported-api");
			throw err;
		}
	}
	async deltaSync(oldCache, registryUrl) {
		try {
			const url = `${registryUrl}/versions`;
			const startByte = oldCache.contentLength - oldCache.contentTail.length;
			const opts = { headers: {
				["Accept-Encoding"]: "deflate, compress, br",
				["Range"]: `bytes=${startByte}-`
			} };
			const { statusCode, body } = await this.http.getText(url, opts);
			/**
			* Rubygems will return the full body instead of `416 Range Not Satisfiable`.
			* In this case, status code will be 200 instead of 206.
			*/
			if (statusCode === 200) return parseFullBody(body);
			if (getContentHead(body) !== oldCache.contentTail) return this.fullSync(registryUrl);
			/**
			* Update the cache with the new data.
			*/
			const delta = stripContentHead(body);
			const packageVersions = reconcilePackageVersions(oldCache.packageVersions, VersionLines.parse(delta));
			const syncedAt = DateTime.now().toJSDate();
			const contentLength = oldCache.contentLength + delta.length;
			const contentTail = getContentTail(body);
			return Result.ok({
				packageVersions,
				syncedAt,
				contentLength,
				contentTail
			});
		} catch (err) {
			// v8 ignore else -- needs a non-http failure during the sync
			if (err instanceof RequestError) {
				const responseStatus = err.response?.statusCode;
				/**
				* In case of `416 Range Not Satisfiable` we do a full sync.
				* This is unlikely to happen in real life, but anyway.
				*/
				if (responseStatus === 416) return this.fullSync(registryUrl);
				/**
				* If the endpoint is not supported, we stop trying.
				* This is unlikely to happen in real life, but still.
				*/
				if (responseStatus === 404) return Result.err("unsupported-api");
			}
			throw err;
		}
	}
};
//#endregion
export { VersionsEndpointCache, memCache };

//# sourceMappingURL=versions-endpoint-cache.js.map