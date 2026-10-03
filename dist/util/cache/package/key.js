//#region lib/util/cache/package/key.ts
/**
* Returns the key used by underlying storage implementations
*/
function getCombinedKey(namespace, key) {
	return `datasource-mem:pkg-fetch:${namespace}:${key}`;
}
//#endregion
export { getCombinedKey };

//# sourceMappingURL=key.js.map