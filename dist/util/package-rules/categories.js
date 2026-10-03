import { anyMatchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/categories.ts
var CategoriesMatcher = class extends Matcher {
	matches({ categories }, { matchCategories }) {
		if (isNullOrUndefined(matchCategories)) return null;
		if (isNullOrUndefined(categories)) return false;
		return anyMatchRegexOrGlobList(categories, matchCategories);
	}
};
//#endregion
export { CategoriesMatcher };

//# sourceMappingURL=categories.js.map