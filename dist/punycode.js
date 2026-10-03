import { __commonJSMin, __require } from "./_virtual/_rolldown/runtime.js";
//#region lib/punycode.cjs
var require_punycode = /* @__PURE__ */ __commonJSMin((() => {
	/**
	* punycode workaround
	*
	* Load punycode.js module to cache and override node built-in.
	*
	* See <https://github.com/renovatebot/renovate/issues/32395>
	*/
	__require("punycode/");
	__require.cache.punycode = __require.cache[__require.resolve("punycode/")];
}));
//#endregion
export default require_punycode();
export { require_punycode };

//# sourceMappingURL=punycode.js.map