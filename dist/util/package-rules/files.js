import { anyMatchRegexOrGlobList, matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isArray, isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/files.ts
var FileNamesMatcher = class extends Matcher {
	matches({ packageFile, lockFiles }, { matchFileNames }) {
		if (isUndefined(matchFileNames)) return null;
		if (isUndefined(packageFile)) return false;
		if (matchRegexOrGlobList(packageFile, matchFileNames)) return true;
		if (isArray(lockFiles)) return anyMatchRegexOrGlobList(lockFiles, matchFileNames);
		return false;
	}
};
//#endregion
export { FileNamesMatcher };

//# sourceMappingURL=files.js.map