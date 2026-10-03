import { anyMatchRegexOrGlobList, matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/dep-types.ts
var DepTypesMatcher = class extends Matcher {
	matches({ depTypes, depType }, { matchDepTypes }) {
		if (isUndefined(matchDepTypes)) return null;
		if (depType) return matchRegexOrGlobList(depType, matchDepTypes);
		if (depTypes) return anyMatchRegexOrGlobList(depTypes, matchDepTypes);
		return false;
	}
};
//#endregion
export { DepTypesMatcher };

//# sourceMappingURL=dep-types.js.map