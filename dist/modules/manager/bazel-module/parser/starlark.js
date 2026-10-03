import { isBoolean } from "@sindresorhus/is";
//#region lib/modules/manager/bazel-module/parser/starlark.ts
const stringMapping = /* @__PURE__ */ new Map([["True", true], ["False", false]]);
const booleanStringValues = Array.from(stringMapping.keys());
function asBoolean(value) {
	const result = stringMapping.get(value);
	if (isBoolean(result)) return result;
	throw new Error(`Invalid Starlark boolean string: ${value}`);
}
//#endregion
export { asBoolean, booleanStringValues };

//# sourceMappingURL=starlark.js.map