import { getRegexOrGlobPredicate } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/new-value.ts
var NewValueMatcher = class extends Matcher {
	matches({ newValue }, { matchNewValue }) {
		if (isUndefined(matchNewValue)) return null;
		const matchNewValuePred = getRegexOrGlobPredicate(matchNewValue);
		if (!newValue) return false;
		return matchNewValuePred(newValue);
	}
};
//#endregion
export { NewValueMatcher };

//# sourceMappingURL=new-value.js.map