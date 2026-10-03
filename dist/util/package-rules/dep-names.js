import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/dep-names.ts
var DepNameMatcher = class extends Matcher {
	matches({ depName }, { matchDepNames }) {
		if (isUndefined(matchDepNames)) return null;
		if (isUndefined(depName)) return false;
		return matchRegexOrGlobList(depName, matchDepNames);
	}
};
//#endregion
export { DepNameMatcher };

//# sourceMappingURL=dep-names.js.map