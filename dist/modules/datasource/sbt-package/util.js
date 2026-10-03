import { regEx } from "../../../util/regex.js";
import { filterMap } from "../../../util/filter-map.js";
import { compare } from "../../versioning/maven/compare.js";
//#region lib/modules/datasource/sbt-package/util.ts
const linkRegExp = regEx(/href=['"](?<href>[^'"]*)\/['"]/gi);
function extractPageLinks(html, filterMapHref) {
	const unfiltered = Array.from(html.matchAll(linkRegExp), (m) => m.groups.href);
	return filterMap(unfiltered, filterMapHref);
}
function getLatestVersion(versions) {
	if (versions?.length) return versions.reduce((latestVersion, version) => compare(version, latestVersion) === 1 ? version : latestVersion);
	return null;
}
//#endregion
export { extractPageLinks, getLatestVersion };

//# sourceMappingURL=util.js.map