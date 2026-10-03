import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/sourceurls.ts
var SourceUrlsMatcher = class extends Matcher {
	matches({ sourceUrl }, { matchSourceUrls }) {
		if (isUndefined(matchSourceUrls)) return null;
		if (!sourceUrl) return false;
		return matchRegexOrGlobList(sourceUrl, matchSourceUrls);
	}
};
//#endregion
export { SourceUrlsMatcher };

//# sourceMappingURL=sourceurls.js.map