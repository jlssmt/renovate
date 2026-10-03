import { find, matchesHost } from "../host-rules.js";
import { isNumber } from "@sindresorhus/is";
//#region lib/util/http/rate-limits.ts
const concurrencyDefaults = [
	{
		matchHost: "registry.npmjs.org",
		concurrency: 999
	},
	{
		matchHost: "repology.org",
		concurrency: 1
	},
	{
		matchHost: "packages.typst.org",
		concurrency: 1
	},
	{
		matchHost: "*",
		concurrency: 16
	}
];
const throttleDefaults = [
	{
		matchHost: "rubygems.org",
		throttleMs: 125
	},
	{
		matchHost: "https://crates.io/api/",
		throttleMs: 1e3
	},
	{
		matchHost: "https://plugins.gradle.org",
		throttleMs: 50
	},
	{
		matchHost: "repology.org",
		throttleMs: 2e3
	}
];
let throttleLimits = [];
let concurrencyLimits = [];
function setHttpRateLimits(concurrencyRules, throttleRules) {
	concurrencyLimits = concurrencyRules ?? concurrencyDefaults;
	throttleLimits = throttleRules ?? throttleDefaults;
}
function matches(url, host) {
	if (host === "*") return true;
	return matchesHost(url, host);
}
function getConcurrentRequestsLimit(url) {
	let result = null;
	const { concurrentRequestLimit: hostRuleLimit } = find({ url });
	if (isNumber(hostRuleLimit) && hostRuleLimit > 0 && hostRuleLimit < Number.MAX_SAFE_INTEGER) result = hostRuleLimit;
	for (const { matchHost, concurrency: limit } of concurrencyLimits) {
		if (!matches(url, matchHost)) continue;
		if (result && result <= limit) continue;
		result = limit;
		break;
	}
	return result;
}
function getThrottleIntervalMs(url) {
	let result = null;
	const { maxRequestsPerSecond } = find({ url });
	if (isNumber(maxRequestsPerSecond) && maxRequestsPerSecond > 0) result = Math.ceil(1e3 / maxRequestsPerSecond);
	for (const { matchHost, throttleMs: limit } of throttleLimits) {
		if (!matches(url, matchHost)) continue;
		if (result && result >= limit) continue;
		result = limit;
		break;
	}
	return result;
}
//#endregion
export { getConcurrentRequestsLimit, getThrottleIntervalMs, setHttpRateLimits };

//# sourceMappingURL=rate-limits.js.map