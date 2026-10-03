import { GlobalConfig } from "../../../config/global.js";
import { matchRegexOrGlob } from "../../string-match.js";
import { isNumber } from "@sindresorhus/is";
//#region lib/util/cache/package/ttl.ts
/**
* This MUST NOT be used outside of cache implementation
*
* @param namespace
*/
function getTtlOverride(namespace) {
	const overrides = GlobalConfig.get("cacheTtlOverride");
	let ttl = overrides[namespace];
	if (isNumber(ttl)) return ttl;
	let maxLen = 0;
	for (const [key, value] of Object.entries(overrides)) {
		if (!isNumber(value)) continue;
		const keyLen = key.length;
		if (keyLen > maxLen && matchRegexOrGlob(namespace, key)) {
			maxLen = keyLen;
			ttl = value;
		}
	}
	if (isNumber(ttl)) return ttl;
}
/**
* Apply user-configured overrides and return the final values for soft/hard TTL.
*
* @param namespace Cache namespace
* @param ttlMinutes TTL value configured in Renovate codebase
* @returns
*/
function resolveTtlValues(namespace, ttlMinutes) {
	const softTtlMinutes = getTtlOverride(namespace) ?? ttlMinutes;
	const cacheHardTtlMinutes = GlobalConfig.get("cacheHardTtlMinutes");
	return {
		softTtlMinutes,
		hardTtlMinutes: Math.max(softTtlMinutes, cacheHardTtlMinutes)
	};
}
//#endregion
export { getTtlOverride, resolveTtlValues };

//# sourceMappingURL=ttl.js.map