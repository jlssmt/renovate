//#region lib/util/cache/memory/index.ts
let memCache;
function init() {
	memCache = {};
}
function reset() {
	memCache = void 0;
}
function get(key) {
	return memCache?.[key];
}
function set(key, value) {
	if (memCache) memCache[key] = value;
}
function cleanDatasourceKeys() {
	if (memCache) {
		for (const key of Object.keys(memCache)) if (key.startsWith("datasource-mem:pkg-fetch:") || key.startsWith("datasource-mem:releases:")) delete memCache[key];
	}
}
//#endregion
export { cleanDatasourceKeys, get, init, reset, set };

//# sourceMappingURL=index.js.map