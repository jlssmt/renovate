import { createHash } from "node:crypto";
import { stringify } from "safe-stable-stringify";
//#region lib/logger/once.ts
/**
* Get the single frame of this function's callers stack.
*
* @param omitFn Starting from this function, stack frames will be ignored.
* @returns The string containing file name, line number and column name.
*
* @example getCallSite() // => 'Object.<anonymous> (/path/to/file.js:10:15)'
*/
function getCallSite(omitFn) {
	const stackTraceLimitOrig = Error.stackTraceLimit;
	const prepareStackTraceOrig = Error.prepareStackTrace;
	let result = null;
	try {
		const res = { stack: [] };
		Error.stackTraceLimit = 1;
		Error.prepareStackTrace = (_err, stack) => stack;
		Error.captureStackTrace(res, omitFn);
		const [callsite] = res.stack;
		// v8 ignore else -- TODO: add test #40625
		if (callsite) result = callsite.toString();
	} catch {} finally {
		Error.stackTraceLimit = stackTraceLimitOrig;
		Error.prepareStackTrace = prepareStackTraceOrig;
	}
	return result;
}
const keys = /* @__PURE__ */ new Set();
function once(callback, omitFn = once, p1, p2) {
	const callsite = getCallSite(omitFn);
	/* v8 ignore next -- should not happen */
	if (!callsite) return;
	const key = `${callsite}|${hashParams(p1, p2)}`;
	if (!keys.has(key)) {
		keys.add(key);
		callback();
	}
}
/**
* Before processing each repository,
* all keys are supposed to be reset.
*/
function reset() {
	keys.clear();
}
function hashParams(p1, p2) {
	const data = p2 === void 0 ? stringify(p1) : `${stringify(p1)}|${stringify(p2)}`;
	return createHash("sha256").update(data).digest("hex");
}
//#endregion
export { once, reset };

//# sourceMappingURL=once.js.map