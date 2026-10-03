import { get, set } from "./cache/memory/index.js";
import { coerceObject } from "./object.js";
import { coerceArray } from "./array.js";
import { logger } from "../logger/index.js";
import { parseUrl } from "./url.js";
//#region lib/util/stats.ts
function makeTimingReport(data) {
	const count = data.length;
	const totalMs = data.reduce((a, c) => a + c, 0);
	const avgMs = count ? Math.round(totalMs / count) : 0;
	let maxMs = 0;
	for (const duration of data) maxMs = Math.max(maxMs, duration);
	const sorted = data.sort((a, b) => a - b);
	return {
		count,
		avgMs,
		medianMs: count ? sorted[Math.floor(count / 2)] : 0,
		maxMs,
		totalMs
	};
}
var LookupStats = class LookupStats {
	static write(datasource, duration) {
		const data = coerceObject(get("lookup-stats"));
		data[datasource] ??= [];
		data[datasource].push(duration);
		set("lookup-stats", data);
	}
	static async wrap(datasource, callback) {
		const start = Date.now();
		const result = await callback();
		const duration = Date.now() - start;
		LookupStats.write(datasource, duration);
		return result;
	}
	static getReport() {
		const report = {};
		const data = coerceObject(get("lookup-stats"));
		for (const [datasource, durations] of Object.entries(data)) report[datasource] = makeTimingReport(durations);
		return report;
	}
	static report() {
		const report = LookupStats.getReport();
		logger.debug(report, "Lookup statistics");
	}
};
var GetDatasourceReleasesStats = class {
	static write(datasource, registryUrl, packageName, duration) {
		const data = coerceArray(get("get-releases-stats"));
		data.push({
			datasource,
			registryUrl,
			packageName,
			duration
		});
		set("get-releases-stats", data);
	}
	static async wrap(datasource, registryUrl, packageName, callback) {
		const start = Date.now();
		const result = await callback();
		const duration = Date.now() - start;
		this.write(datasource, registryUrl, packageName, duration);
		return result;
	}
	static getReport() {
		const data = coerceArray(get("get-releases-stats"));
		const durationData = {
			stats: [],
			datasources: {}
		};
		for (const { datasource, registryUrl, packageName, duration } of data) {
			durationData.stats.push(duration);
			durationData.datasources[datasource] ??= {
				stats: [],
				registryUrls: {}
			};
			durationData.datasources[datasource].stats.push(duration);
			durationData.datasources[datasource].registryUrls[registryUrl] ??= {
				stats: [],
				packages: {}
			};
			durationData.datasources[datasource].registryUrls[registryUrl].stats.push(duration);
			durationData.datasources[datasource].registryUrls[registryUrl].packages[packageName] ??= [];
			durationData.datasources[datasource].registryUrls[registryUrl].packages[packageName].push(duration);
		}
		const report = {
			stats: makeTimingReport(durationData.stats),
			datasources: {}
		};
		for (const [datasource, datasourceData] of Object.entries(durationData.datasources)) {
			report.datasources[datasource] = {
				stats: makeTimingReport(datasourceData.stats),
				registryUrls: {}
			};
			for (const [registryUrl, registryUrlData] of Object.entries(datasourceData.registryUrls)) {
				report.datasources[datasource].registryUrls[registryUrl] = {
					stats: makeTimingReport(registryUrlData.stats),
					packages: {}
				};
				for (const [packageName, packageNameData] of Object.entries(registryUrlData.packages)) report.datasources[datasource].registryUrls[registryUrl].packages[packageName] = makeTimingReport(packageNameData);
			}
		}
		return report;
	}
	static report() {
		const report = this.getReport();
		const shortReport = {
			stats: report.stats,
			datasources: {}
		};
		for (const [datasource, datasourceData] of Object.entries(report.datasources)) {
			shortReport.datasources[datasource] = {
				stats: datasourceData.stats,
				registryUrls: {}
			};
			for (const [registryUrl, registryUrlData] of Object.entries(datasourceData.registryUrls)) shortReport.datasources[datasource].registryUrls[registryUrl] = { stats: registryUrlData.stats };
		}
		logger.trace(report, "getReleases statistics with packages");
		logger.debug(shortReport, "getReleases statistics summary");
	}
};
var PackageCacheStats = class PackageCacheStats {
	static writeSet(duration) {
		const data = coerceArray(get("package-cache-sets"));
		data.push(duration);
		set("package-cache-sets", data);
	}
	static async wrapSet(callback) {
		const start = Date.now();
		const result = await callback();
		const duration = Date.now() - start;
		PackageCacheStats.writeSet(duration);
		return result;
	}
	static writeGet(duration) {
		const data = coerceArray(get("package-cache-gets"));
		data.push(duration);
		set("package-cache-gets", data);
	}
	static async wrapGet(callback) {
		const start = Date.now();
		const result = await callback();
		const duration = Date.now() - start;
		PackageCacheStats.writeGet(duration);
		return result;
	}
	static getReport() {
		return {
			get: makeTimingReport(coerceArray(get("package-cache-gets"))),
			set: makeTimingReport(coerceArray(get("package-cache-sets")))
		};
	}
	static report() {
		const report = PackageCacheStats.getReport();
		logger.debug(report, "Package cache statistics");
	}
};
var DatasourceCacheStats = class {
	static getData() {
		return coerceArray(get("datasource-cache-stats"));
	}
	static setData(data) {
		set("datasource-cache-stats", data);
	}
	static hit(datasource, registryUrl, packageName) {
		const data = this.getData();
		data.push({
			datasource,
			registryUrl,
			packageName,
			action: "hit"
		});
		this.setData(data);
	}
	static miss(datasource, registryUrl, packageName) {
		const data = this.getData();
		data.push({
			datasource,
			registryUrl,
			packageName,
			action: "miss"
		});
		this.setData(data);
	}
	static set(datasource, registryUrl, packageName) {
		const data = this.getData();
		data.push({
			datasource,
			registryUrl,
			packageName,
			action: "set"
		});
		this.setData(data);
	}
	static skip(datasource, registryUrl, packageName) {
		const data = this.getData();
		data.push({
			datasource,
			registryUrl,
			packageName,
			action: "skip"
		});
		this.setData(data);
	}
	static getReport() {
		const data = this.getData();
		const result = {
			long: {},
			short: {}
		};
		for (const { datasource, registryUrl, packageName, action } of data) {
			result.long[datasource] ??= {};
			result.long[datasource][registryUrl] ??= {};
			result.long[datasource][registryUrl] ??= {};
			result.long[datasource][registryUrl][packageName] ??= {};
			result.short[datasource] ??= {};
			result.short[datasource][registryUrl] ??= {
				hit: 0,
				miss: 0,
				set: 0,
				skip: 0
			};
			if (action === "hit") {
				result.long[datasource][registryUrl][packageName].read = "hit";
				result.short[datasource][registryUrl].hit += 1;
				continue;
			}
			if (action === "miss") {
				result.long[datasource][registryUrl][packageName].read = "miss";
				result.short[datasource][registryUrl].miss += 1;
				continue;
			}
			if (action === "set") {
				result.long[datasource][registryUrl][packageName].write = "set";
				result.short[datasource][registryUrl].set += 1;
				continue;
			}
			/* v8 ignore else -- TODO: add tests #40625 */
			if (action === "skip") {
				result.long[datasource][registryUrl][packageName].write = "skip";
				result.short[datasource][registryUrl].skip += 1;
				continue;
			}
		}
		return result;
	}
	static report() {
		const { long, short } = this.getReport();
		if (Object.keys(short).length > 0) logger.debug(short, "Datasource cache statistics");
		if (Object.keys(long).length > 0) logger.trace(long, "Datasource cache detailed statistics");
	}
};
var HttpStats = class HttpStats {
	static write(data) {
		const httpRequests = coerceArray(get("http-requests"));
		httpRequests.push(data);
		set("http-requests", httpRequests);
	}
	static getDataPoints() {
		const httpRequests = coerceArray(get("http-requests"));
		// istanbul ignore next: sorting is hard and not worth testing
		httpRequests.sort((a, b) => {
			if (a.url < b.url) return -1;
			if (a.url > b.url) return 1;
			return 0;
		});
		return httpRequests;
	}
	static getReport() {
		const dataPoints = HttpStats.getDataPoints();
		const requests = dataPoints.length;
		const urls = {};
		const rawRequests = [];
		const hostRequests = {};
		for (const dataPoint of dataPoints) {
			const { url, reqMs, queueMs, status } = dataPoint;
			const method = dataPoint.method.toUpperCase();
			const parsedUrl = parseUrl(url);
			if (!parsedUrl) {
				logger.debug({ url }, "Failed to parse URL during stats reporting");
				continue;
			}
			const { hostname, origin, pathname } = parsedUrl;
			const baseUrl = `${origin}${pathname}`;
			urls[baseUrl] ??= {};
			urls[baseUrl][method] ??= {};
			urls[baseUrl][method][status] ??= 0;
			urls[baseUrl][method][status] += 1;
			rawRequests.push(`${method} ${url} ${status} ${reqMs} ${queueMs}`);
			hostRequests[hostname] ??= [];
			hostRequests[hostname].push(dataPoint);
		}
		const hosts = {};
		for (const [hostname, dataPoints] of Object.entries(hostRequests)) {
			const count = dataPoints.length;
			const reqTimes = dataPoints.map((r) => r.reqMs);
			const queueTimes = dataPoints.map((r) => r.queueMs);
			const reqReport = makeTimingReport(reqTimes);
			const queueReport = makeTimingReport(queueTimes);
			hosts[hostname] = {
				count,
				reqAvgMs: reqReport.avgMs,
				reqMedianMs: reqReport.medianMs,
				reqMaxMs: reqReport.maxMs,
				queueAvgMs: queueReport.avgMs,
				queueMedianMs: queueReport.medianMs,
				queueMaxMs: queueReport.maxMs
			};
		}
		return {
			urls,
			rawRequests,
			hostRequests,
			hosts,
			requests
		};
	}
	static report() {
		const { urls, rawRequests, hostRequests, hosts, requests } = HttpStats.getReport();
		logger.trace({
			rawRequests,
			hostRequests
		}, "HTTP full statistics");
		logger.debug({
			hosts,
			requests
		}, "HTTP statistics");
		logger.trace({ urls }, "HTTP URL statistics");
	}
};
function sortObject(obj) {
	const result = {};
	for (const key of Object.keys(obj).sort()) result[key] = obj[key];
	return result;
}
var HttpCacheStats = class HttpCacheStats {
	static getData() {
		return coerceObject(get("http-cache-stats"));
	}
	static read(key) {
		return this.getData()?.[key] ?? {
			hit: 0,
			miss: 0
		};
	}
	static write(key, data) {
		const stats = coerceObject(get("http-cache-stats"));
		stats[key] = data;
		set("http-cache-stats", stats);
	}
	static getBaseUrl(url) {
		const parsedUrl = parseUrl(url);
		if (!parsedUrl) {
			logger.debug({ url }, "Failed to parse URL during cache stats");
			return null;
		}
		const { origin, pathname } = parsedUrl;
		return `${origin}${pathname}`;
	}
	static incLocalHits(url) {
		const baseUrl = HttpCacheStats.getBaseUrl(url);
		/* v8 ignore else -- TODO: add tests #40625 */
		if (baseUrl) {
			const host = baseUrl;
			const stats = HttpCacheStats.read(host);
			stats.localHit ??= 0;
			stats.localHit += 1;
			HttpCacheStats.write(host, stats);
		}
	}
	static incLocalMisses(url) {
		const baseUrl = HttpCacheStats.getBaseUrl(url);
		/* v8 ignore else -- TODO: add tests #40625 */
		if (baseUrl) {
			const host = baseUrl;
			const stats = HttpCacheStats.read(host);
			stats.localMiss ??= 0;
			stats.localMiss += 1;
			HttpCacheStats.write(host, stats);
		}
	}
	static incRemoteHits(url) {
		const baseUrl = HttpCacheStats.getBaseUrl(url);
		/* v8 ignore else -- TODO: add tests #40625 */
		if (baseUrl) {
			const host = baseUrl;
			const stats = HttpCacheStats.read(host);
			stats.hit += 1;
			HttpCacheStats.write(host, stats);
		}
	}
	static incRemoteMisses(url) {
		const baseUrl = HttpCacheStats.getBaseUrl(url);
		/* v8 ignore else -- TODO: add tests #40625 */
		if (baseUrl) {
			const host = baseUrl;
			const stats = HttpCacheStats.read(host);
			stats.miss += 1;
			HttpCacheStats.write(host, stats);
		}
	}
	static report() {
		const data = HttpCacheStats.getData();
		let report = {};
		for (const [url, stats] of Object.entries(data)) {
			const parsedUrl = parseUrl(url);
			/* v8 ignore else -- TODO: add tests #40625 */
			if (parsedUrl) {
				const { origin, pathname } = parsedUrl;
				report[origin] ??= {};
				report[origin][pathname] = stats;
			}
		}
		for (const [host, hostStats] of Object.entries(report)) report[host] = sortObject(hostStats);
		report = sortObject(report);
		logger.debug(report, "HTTP cache statistics");
	}
};
/* v8 ignore next: temporary code */
var ObsoleteCacheHitLogger = class {
	static getData() {
		return coerceObject(get("obsolete-cache-stats"));
	}
	static write(url) {
		const data = this.getData();
		if (!data[url]) data[url] = { count: 0 };
		data[url].count++;
		set("obsolete-cache-stats", data);
	}
	static report() {
		const hits = this.getData();
		logger.debug({
			count: Object.keys(hits).length,
			hits
		}, "Cache fallback URLs");
	}
};
var AbandonedPackageStats = class {
	static getData() {
		return coerceArray(get("abandonment-stats"));
	}
	static setData(data) {
		set("abandonment-stats", data);
	}
	static write(datasource, packageName, mostRecentTimestamp) {
		const data = this.getData();
		data.push({
			datasource,
			packageName,
			mostRecentTimestamp
		});
		this.setData(data);
	}
	static getReport() {
		const data = this.getData();
		const result = {};
		for (const { datasource, packageName, mostRecentTimestamp } of data) {
			result[datasource] ??= {};
			result[datasource][packageName] = mostRecentTimestamp;
		}
		const sortedResult = {};
		for (const datasource of Object.keys(result).sort()) {
			sortedResult[datasource] = {};
			for (const packageName of Object.keys(result[datasource]).sort()) sortedResult[datasource][packageName] = result[datasource][packageName];
		}
		return sortedResult;
	}
	static report() {
		const report = this.getReport();
		if (Object.keys(report).length > 0) logger.debug(report, "Abandoned package statistics");
	}
};
var GitOperationStats = class GitOperationStats {
	static write(operationType, duration) {
		const data = coerceObject(get("git-operations-stats"));
		data[operationType] ??= [];
		data[operationType].push(duration);
		set("git-operations-stats", data);
	}
	static getReport() {
		const report = {};
		const data = coerceObject(get("git-operations-stats"));
		for (const [operationType, durations] of Object.entries(data)) {
			report[operationType] = makeTimingReport(durations);
			report[operationType].totalMs = Math.ceil(report[operationType].totalMs);
		}
		return report;
	}
	static report() {
		const report = GitOperationStats.getReport();
		logger.debug(report, "Git operations statistics");
	}
};
//#endregion
export { AbandonedPackageStats, DatasourceCacheStats, GetDatasourceReleasesStats, GitOperationStats, HttpCacheStats, HttpStats, LookupStats, ObsoleteCacheHitLogger, PackageCacheStats, makeTimingReport };

//# sourceMappingURL=stats.js.map