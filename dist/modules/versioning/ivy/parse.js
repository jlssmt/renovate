import { regEx } from "../../../util/regex.js";
import { isSingleVersion as isVersion, parseRange, rangeToStr } from "../maven/compare.js";
//#region lib/modules/versioning/ivy/parse.ts
const REV_TYPE_LATEST = "REV_TYPE_LATEST";
const REV_TYPE_SUBREV = "REV_TYPE_SUBREVISION";
const REV_TYPE_RANGE = "REV_TYPE_RANGE";
const LATEST_REGEX = regEx(/^latest\.|^latest$/i);
function parseDynamicRevision(str) {
	if (!str) return null;
	if (LATEST_REGEX.test(str)) {
		const value = str.replace(LATEST_REGEX, "").toLowerCase() || "";
		return {
			type: REV_TYPE_LATEST,
			value: value === "integration" ? "" : value
		};
	}
	const SUBREV_REGEX = regEx(/\.\+$/);
	if (str.endsWith(".+")) {
		const value = str.replace(SUBREV_REGEX, "");
		if (isVersion(value)) return {
			type: REV_TYPE_SUBREV,
			value
		};
	}
	const range = parseRange(str);
	if (range?.length === 1) return {
		type: REV_TYPE_RANGE,
		value: rangeToStr(range)
	};
	return null;
}
//#endregion
export { LATEST_REGEX, REV_TYPE_LATEST, REV_TYPE_RANGE, REV_TYPE_SUBREV, parseDynamicRevision };

//# sourceMappingURL=parse.js.map