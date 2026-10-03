import { classifyRelease } from "./update-type.js";
import { isString } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/bucket.ts
function getBucket(config, currentVersion, newVersion, versioningApi) {
	const { separateMajorMinor, separateMultipleMajor, separateMultipleMinor, separateMinorPatch } = config;
	if (!separateMajorMinor) return "latest";
	const toMajor = versioningApi.getMajor(newVersion);
	// istanbul ignore if: error case
	if (toMajor === null) return null;
	const updateType = classifyRelease(versioningApi, currentVersion, newVersion);
	if (updateType === "major") {
		if (separateMultipleMajor) return `v${toMajor}`;
		return "major";
	}
	const fromMinor = versioningApi.getMinor(currentVersion);
	const toMinor = versioningApi.getMinor(newVersion);
	// istanbul ignore if: error case
	if (fromMinor === null || toMinor === null) return "non-major";
	if (updateType === "minor") {
		if (separateMultipleMinor) return `v${toMajor}.${toMinor}`;
		if (separateMinorPatch) return "minor";
		return "non-major";
	}
	if (separateMinorPatch) return "patch";
	return "non-major";
}
/**
* Group candidate releases by the bucket their update would land in.
*
* Releases which have no bucket are dropped.
*/
function groupReleasesIntoBuckets(config, currentVersion, releases, versioningApi) {
	const buckets = {};
	for (const release of releases) {
		const bucket = getBucket(config, currentVersion, release.version, versioningApi);
		// v8 ignore else -- see #40625
		if (isString(bucket)) {
			buckets[bucket] ??= [];
			buckets[bucket].push(release);
		}
	}
	return buckets;
}
//#endregion
export { getBucket, groupReleasesIntoBuckets };

//# sourceMappingURL=bucket.js.map