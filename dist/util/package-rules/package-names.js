import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/package-names.ts
var PackageNameMatcher = class extends Matcher {
	matches({ packageName }, packageRule) {
		const { matchPackageNames } = packageRule;
		if (isUndefined(matchPackageNames)) return null;
		if (!packageName) return false;
		return matchRegexOrGlobList(packageName, matchPackageNames);
	}
};
//#endregion
export { PackageNameMatcher };

//# sourceMappingURL=package-names.js.map