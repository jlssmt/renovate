import { getRegexOrGlobPredicate } from "../util/string-match.js";
//#region lib/logger/remap.ts
let globalRemaps;
let repositoryRemaps;
let matcherCache = /* @__PURE__ */ new WeakMap();
function match(remap, input) {
	const { matchMessage: pattern } = remap;
	let matchFn = matcherCache.get(remap);
	// v8 ignore else -- TODO: add test #40625
	if (!matchFn) {
		matchFn = getRegexOrGlobPredicate(pattern);
		matcherCache.set(remap, matchFn);
	}
	return matchFn(input);
}
function getRemappedLevel(msg) {
	if (repositoryRemaps) {
		for (const remap of repositoryRemaps)
 // v8 ignore else -- TODO: add test #40625
		if (match(remap, msg)) return remap.newLogLevel;
	}
	if (globalRemaps) {
		for (const remap of globalRemaps) if (match(remap, msg)) return remap.newLogLevel;
	}
	return null;
}
function resetMatcherCache() {
	matcherCache = /* @__PURE__ */ new WeakMap();
}
function setGlobalLogLevelRemaps(remaps) {
	globalRemaps = remaps;
}
function resetGlobalLogLevelRemaps() {
	globalRemaps = void 0;
	resetMatcherCache();
}
function setRepositoryLogLevelRemaps(remaps) {
	repositoryRemaps = remaps;
}
function resetRepositoryLogLevelRemaps() {
	repositoryRemaps = void 0;
	resetMatcherCache();
}
//#endregion
export { getRemappedLevel, resetGlobalLogLevelRemaps, resetRepositoryLogLevelRemaps, setGlobalLogLevelRemaps, setRepositoryLogLevelRemaps };

//# sourceMappingURL=remap.js.map