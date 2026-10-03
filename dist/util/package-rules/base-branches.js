import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/base-branches.ts
var BaseBranchesMatcher = class extends Matcher {
	matches({ baseBranch }, { matchBaseBranches }) {
		if (isUndefined(matchBaseBranches)) return null;
		if (isUndefined(baseBranch)) return false;
		return matchRegexOrGlobList(baseBranch, matchBaseBranches);
	}
};
//#endregion
export { BaseBranchesMatcher };

//# sourceMappingURL=base-branches.js.map