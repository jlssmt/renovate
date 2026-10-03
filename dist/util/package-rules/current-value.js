import { getRegexOrGlobPredicate } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/current-value.ts
var CurrentValueMatcher = class extends Matcher {
	matches({ currentValue }, { matchCurrentValue }) {
		if (isUndefined(matchCurrentValue)) return null;
		const matchCurrentValuePred = getRegexOrGlobPredicate(matchCurrentValue);
		if (!currentValue) return false;
		return matchCurrentValuePred(currentValue);
	}
};
//#endregion
export { CurrentValueMatcher };

//# sourceMappingURL=current-value.js.map