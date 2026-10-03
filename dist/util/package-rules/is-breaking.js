import { Matcher } from "./base.js";
import { isNullOrUndefined, isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/is-breaking.ts
var IsBreakingMatcher = class extends Matcher {
	matches({ isBreaking }, { matchIsBreaking }) {
		if (isUndefined(matchIsBreaking)) return null;
		if (isNullOrUndefined(isBreaking)) return false;
		return isBreaking === matchIsBreaking;
	}
};
//#endregion
export { IsBreakingMatcher };

//# sourceMappingURL=is-breaking.js.map