import { logger } from "../../../../logger/index.js";
import { getElapsedDays } from "../../../../util/date.js";
import { getMergeConfidenceLevel } from "../../../../util/merge-confidence/index.js";
import { classifyRelease } from "./update-type.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/generate.ts
async function generateUpdate(config, currentValue, versioningApi, rangeStrategy, currentVersion, bucket, release, allVersions) {
	const newVersion = release.version;
	const update = {
		bucket,
		newVersion,
		newValue: null,
		hasAttestation: release.attestation
	};
	if (release.checksumUrl !== void 0) update.checksumUrl = release.checksumUrl;
	if (release.downloadUrl !== void 0) update.downloadUrl = release.downloadUrl;
	if (release.newDigest !== void 0) update.newDigest = release.newDigest;
	if (release.releaseTimestamp) {
		update.releaseTimestamp = release.releaseTimestamp;
		update.newVersionAgeInDays = getElapsedDays(release.releaseTimestamp);
	}
	if (release.registryUrl !== void 0)
 /**
	* This means:
	*  - registry strategy is set to merge
	*  - releases were fetched from multiple registry urls
	*/
	update.registryUrl = release.registryUrl;
	if (currentValue) try {
		if (config.isLockfileOnly) update.newValue = currentValue;
		else update.newValue = versioningApi.getNewValue({
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion,
			allVersions
		});
	} catch (err) {
		logger.warn({
			err,
			currentValue,
			rangeStrategy,
			currentVersion,
			newVersion
		}, "getNewValue error");
		update.newValue = currentValue;
	}
	else update.newValue = currentValue;
	update.newMajor = versioningApi.getMajor(newVersion);
	update.newMinor = versioningApi.getMinor(newVersion);
	update.newPatch = versioningApi.getPatch(newVersion);
	if (!update.updateType && !currentVersion) {
		logger.debug({ update }, "Update has no currentVersion");
		update.newValue = currentValue;
		return update;
	}
	update.updateType = update.updateType ?? classifyRelease(versioningApi, currentVersion, newVersion);
	if (versioningApi.isBreaking) update.isBreaking = versioningApi.isBreaking(currentVersion, newVersion);
	else update.isBreaking = update.updateType === "major";
	const { datasource, packageName, packageRules } = config;
	if (packageRules?.some((pr) => isNonEmptyArray(pr.matchConfidence))) update.mergeConfidenceLevel = await getMergeConfidenceLevel(datasource, packageName, currentVersion, newVersion, update.updateType);
	if (!versioningApi.isVersion(update.newValue)) update.isRange = true;
	if ((config.isLockfileOnly || rangeStrategy === "update-lockfile") && currentValue === update.newValue) update.isLockfileUpdate = true;
	if (rangeStrategy === "bump" && versioningApi.matches(newVersion, currentValue)) update.isBump = true;
	return update;
}
//#endregion
export { generateUpdate };

//# sourceMappingURL=generate.js.map