import { get as get$1, set as set$1 } from "../memory/index.js";
import { PackageCacheStats } from "../../stats.js";
import { destroy, get as get$2, getCacheType as getCacheType$1, init as init$1, set as set$2 } from "./backend.js";
import { getCombinedKey } from "./key.js";
import { getTtlOverride } from "./ttl.js";
//#region lib/util/cache/package/index.ts
function getCacheType() {
	return getCacheType$1();
}
async function get(namespace, key) {
	if (!getCacheType$1()) return;
	const combinedKey = getCombinedKey(namespace, key);
	let cachedPromise = get$1(combinedKey);
	if (!cachedPromise) {
		cachedPromise = PackageCacheStats.wrapGet(() => get$2(namespace, key));
		set$1(combinedKey, cachedPromise);
	}
	return await cachedPromise;
}
/**
* Set cache value with user-defined TTL overrides.
*/
async function set(namespace, key, value, hardTtlMinutes) {
	await setWithRawTtl(namespace, key, value, getTtlOverride(namespace) ?? hardTtlMinutes);
}
/**
* Set cache value ignoring user-defined TTL overrides.
* This MUST NOT be used outside of cache implementation
*/
async function setWithRawTtl(namespace, key, value, hardTtlMinutes) {
	if (!getCacheType$1()) return;
	await PackageCacheStats.wrapSet(() => set$2(namespace, key, value, hardTtlMinutes));
	const combinedKey = getCombinedKey(namespace, key);
	const p = Promise.resolve(value);
	set$1(combinedKey, p);
}
async function init(config) {
	await init$1(config);
}
async function cleanup(_config) {
	await destroy();
}
//#endregion
export { cleanup, get, getCacheType, init, set, setWithRawTtl };

//# sourceMappingURL=index.js.map