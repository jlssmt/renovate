import { getRegexPredicate } from "../string-match.js";
import { logger } from "../../logger/index.js";
import { get } from "../../modules/versioning/index.js";
import { Matcher } from "./base.js";
import { isNullOrUndefined, isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/current-version.ts
var CurrentVersionMatcher = class extends Matcher {
	matches({ versioning, lockedVersion, currentValue, currentVersion }, { matchCurrentVersion }) {
		if (isUndefined(matchCurrentVersion)) return null;
		const isUnconstrainedValue = !!lockedVersion && isNullOrUndefined(currentValue);
		const versioningApi = get(versioning);
		const matchCurrentVersionStr = matchCurrentVersion.toString();
		const matchCurrentVersionPred = getRegexPredicate(matchCurrentVersionStr);
		if (matchCurrentVersionPred) {
			const compareVersion = lockedVersion ?? currentVersion ?? currentValue;
			return !isNullOrUndefined(compareVersion) && matchCurrentVersionPred(compareVersion);
		}
		if (versioningApi.isVersion(matchCurrentVersionStr)) try {
			return isUnconstrainedValue || !!(currentValue && versioningApi.isValid(currentValue) && versioningApi.matches(matchCurrentVersionStr, currentValue));
		} catch {
			return false;
		}
		const compareVersion = versioningApi.isVersion(currentValue) ? currentValue : lockedVersion ?? currentVersion;
		if (isNullOrUndefined(compareVersion)) return false;
		if (versioningApi.isVersion(compareVersion)) return versioningApi.matches(compareVersion, matchCurrentVersion);
		logger.debug({
			matchCurrentVersionStr,
			currentValue
		}, "Could not find a version to compare");
		return false;
	}
};
//#endregion
export { CurrentVersionMatcher };

//# sourceMappingURL=current-version.js.map