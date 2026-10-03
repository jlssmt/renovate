//#region lib/workers/repository/process/lookup/update-type.ts
/**
* Classify the step from `currentVersion` to `newVersion`.
*
* Versionings which implement `isSame()` decide for themselves which part of a version is the major and which the minor, because their numeric `getMajor()`/`getMinor()` cannot express it - `pvp` for instance treats the first two components together as the major, so `getMajor()` has to squash them into a float and reports `1.1` for both `1.1.0` and `1.10.0`. Every other versioning falls back to comparing those numbers.
*/
function classifyRelease(versioningApi, currentVersion, newVersion) {
	if (versioningApi.isSame) {
		if (!versioningApi.isSame("major", newVersion, currentVersion)) return "major";
		if (!versioningApi.isSame("minor", newVersion, currentVersion)) return "minor";
		return "patch";
	}
	if (versioningApi.getMajor(newVersion) !== versioningApi.getMajor(currentVersion)) return "major";
	if (versioningApi.getMinor(newVersion) !== versioningApi.getMinor(currentVersion)) return "minor";
	return "patch";
}
//#endregion
export { classifyRelease };

//# sourceMappingURL=update-type.js.map