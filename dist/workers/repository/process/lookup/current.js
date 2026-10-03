import { regEx } from "../../../../util/regex.js";
import { isString } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/current.ts
function getCurrentVersion(currentValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, allVersions) {
	// istanbul ignore if
	if (!isString(currentValue)) return null;
	let useVersions = allVersions.filter((v) => versioningApi.matches(v, currentValue));
	if (useVersions.length === 1) return useVersions[0];
	if (latestVersion && versioningApi.matches(latestVersion, currentValue)) useVersions = useVersions.filter((v) => !versioningApi.isGreaterThan(v, latestVersion));
	if (rangeStrategy === "pin") return lockedVersion || versioningApi.getSatisfyingVersion(useVersions, currentValue);
	if (rangeStrategy === "bump") return versioningApi.minSatisfyingVersion(useVersions, currentValue);
	const satisfyingVersion = versioningApi.getSatisfyingVersion(useVersions, currentValue);
	if (satisfyingVersion) return satisfyingVersion;
	if (versioningApi.isVersion(currentValue)) return currentValue;
	if (versioningApi.isSingleVersion(currentValue)) return currentValue.replace(regEx(/=/g), "").trim();
	return null;
}
/**
* Run `getCurrentVersion()` over the non-deprecated releases first, falling back to all of them.
*/
function getCurrentVersionFromReleases(compareValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, releases) {
	return getCurrentVersion(compareValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, releases.filter((release) => !release.isDeprecated).map((release) => release.version)) ?? getCurrentVersion(compareValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, releases.map((release) => release.version));
}
/**
* Resolve the version `currentValue` is treated as being at, preferring
* non-deprecated releases and falling back to all of them.
*/
function resolveCurrentVersion(compareValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, releases) {
	let currentVersion;
	if (rangeStrategy === "update-lockfile") currentVersion = lockedVersion;
	else if (compareValue && versioningApi.isSingleVersion(compareValue) && releases.some((release) => release.version === compareValue)) currentVersion = compareValue;
	currentVersion ??= getCurrentVersionFromReleases(compareValue, lockedVersion, versioningApi, rangeStrategy, latestVersion, releases) ?? void 0;
	return currentVersion;
}
/**
* Resolve the newest version matching `compareValue`, regardless of the
* configured `rangeStrategy`.
*
* This is the release a `digest`/`pinDigest` update's current value resolves
* to right now, so it is what such an update must be aged against.
*/
function getNewestMatchingVersion(compareValue, versioningApi, latestVersion, releases) {
	return getCurrentVersionFromReleases(compareValue, "", versioningApi, "replace", latestVersion, releases);
}
//#endregion
export { getCurrentVersion, getNewestMatchingVersion, resolveCurrentVersion };

//# sourceMappingURL=current.js.map