import { anyMatchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/update-types.ts
var UpdateTypesMatcher = class extends Matcher {
	matches({ updateType, isBump }, { matchUpdateTypes }) {
		if (isUndefined(matchUpdateTypes)) return null;
		if (!updateType) return false;
		const toMatch = [updateType];
		if (isBump) toMatch.push("bump");
		return anyMatchRegexOrGlobList(toMatch, matchUpdateTypes);
	}
};
//#endregion
export { UpdateTypesMatcher };

//# sourceMappingURL=update-types.js.map