import { isUndefined } from "@sindresorhus/is";
import { parse } from "node-html-parser";
//#region lib/util/html.ts
function parse$1(html, config) {
	if (!isUndefined(config)) return parse(html, config);
	return parse(html);
}
//#endregion
export { parse$1 as parse };

//# sourceMappingURL=html.js.map