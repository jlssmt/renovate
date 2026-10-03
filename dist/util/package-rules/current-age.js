import { satisfiesDateRange } from "../pretty-time.js";
import { Matcher } from "./base.js";
import { isString } from "@sindresorhus/is";
//#region lib/util/package-rules/current-age.ts
var CurrentAgeMatcher = class extends Matcher {
	matches({ currentVersionTimestamp }, { matchCurrentAge }) {
		if (!isString(matchCurrentAge)) return null;
		if (!isString(currentVersionTimestamp)) return false;
		return satisfiesDateRange(currentVersionTimestamp, matchCurrentAge);
	}
};
//#endregion
export { CurrentAgeMatcher };

//# sourceMappingURL=current-age.js.map