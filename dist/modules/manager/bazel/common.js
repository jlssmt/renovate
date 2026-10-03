import { parse } from "./parser.js";
import { isNumber, isString } from "@sindresorhus/is";
//#region lib/modules/manager/bazel/common.ts
function findCodeFragment(input, path) {
	const parsed = parse(input);
	if (!parsed) return null;
	const [ruleIndex, ...restPath] = path;
	let fragment = parsed[ruleIndex];
	for (const key of restPath) {
		if (!fragment) break;
		if (fragment.type === "array" && isNumber(key)) fragment = fragment.children[key];
		if (fragment.type === "record" && isString(key)) fragment = fragment.children[key];
	}
	return fragment ?? null;
}
function patchCodeAtFragment(input, fragment, updater) {
	const { value, offset } = fragment;
	const left = input.slice(0, offset);
	const right = input.slice(offset + value.length);
	return isString(updater) ? `${left}${updater}${right}` : `${left}${updater(value)}${right}`;
}
function patchCodeAtFragments(input, fragments, updater) {
	const sortedFragments = fragments.sort(({ offset: a }, { offset: b }) => b - a);
	let result = input;
	for (const fragment of sortedFragments) result = patchCodeAtFragment(result, fragment, updater);
	return result;
}
function updateCode(input, path, updater) {
	const fragment = findCodeFragment(input, path);
	if (!fragment) return input;
	return patchCodeAtFragment(input, fragment, updater);
}
//#endregion
export { findCodeFragment, patchCodeAtFragment, patchCodeAtFragments, updateCode };

//# sourceMappingURL=common.js.map