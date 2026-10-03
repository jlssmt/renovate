import { regEx } from "../../util/regex.js";
import "@sindresorhus/is";
regEx(/\[[^\]]+\]\([^)]+\)/);
function getExcludedVersions(range) {
	return range.split(",").map((v) => v.trim()).filter((version) => regEx(/^!=/).test(version)).map((version) => version.replace("!=", "").trim());
}
function getFilteredRange(range) {
	return range.split(",").map((v) => v.trim()).filter((version) => !regEx(/^!=/).test(version)).join(",");
}
//#endregion
export { getExcludedVersions, getFilteredRange };

//# sourceMappingURL=common.js.map