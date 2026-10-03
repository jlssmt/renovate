import { Minimatch } from "minimatch";
//#region lib/util/minimatch.ts
const cache = /* @__PURE__ */ new Map();
function minimatch(pattern, options, useCache = true) {
	const key = options ? `${pattern}:${JSON.stringify(options)}` : pattern;
	if (useCache) {
		const cachedResult = cache.get(key);
		if (cachedResult) return cachedResult;
	}
	const instance = new Minimatch(pattern, options);
	if (useCache) cache.set(key, instance);
	return instance;
}
//#endregion
export { minimatch };

//# sourceMappingURL=minimatch.js.map