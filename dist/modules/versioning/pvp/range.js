import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/pvp/range.ts
const gteAndLtRange = regEx(/>=(?<lower>[\d.]+)&&<(?<upper>[\d.]+)/);
const ltAndGteRange = regEx(/<(?<upper>[\d.]+)&&>=(?<lower>[\d.]+)/);
function parseRange(input) {
	const noSpaces = input.replaceAll(" ", "");
	let m = gteAndLtRange.exec(noSpaces);
	if (!m?.groups) {
		m = ltAndGteRange.exec(noSpaces);
		if (!m?.groups) return null;
	}
	return {
		lower: m.groups.lower,
		upper: m.groups.upper
	};
}
//#endregion
export { parseRange };

//# sourceMappingURL=range.js.map