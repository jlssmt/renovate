import { instrument } from "./index.js";
//#region lib/instrumentation/with-instrumenting.ts
/**
* Creates a wrapped version of an async function that instruments each call.
*
* @param options - Instrumentation options
* @param fn - The async function to wrap
* @returns A new function that instruments each call
*/
function withInstrumenting(options, fn) {
	const { name, attributes, ignoreParentSpan, kind } = options;
	return (...args) => {
		return instrument(name, () => fn(...args), {
			attributes,
			root: ignoreParentSpan,
			kind
		});
	};
}
//#endregion
export { withInstrumenting };

//# sourceMappingURL=with-instrumenting.js.map