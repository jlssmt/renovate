import { logger } from "../../../../logger/index.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import "../../../../config/index.js";
import { getMergeConfidenceLevel, isActiveConfidenceLevel, satisfiesConfidenceLevel } from "../../../../util/merge-confidence/index.js";
import { applyPackageRules } from "../../../../util/package-rules/index.js";
import { postprocessRelease } from "../../../../modules/datasource/postprocess-release.js";
import { classifyRelease } from "./update-type.js";
import { checkMinimumReleaseAge } from "../../../../util/minimum-release-age.js";
//#region lib/workers/repository/process/lookup/filter-checks.ts
/**
* Emitted by every `minimumReleaseAge` check which had no `releaseTimestamp` to
* age against while `minimumReleaseAgeBehaviour=timestamp-optional`.
*
* Shared as a constant rather than a helper function so that each caller keeps
* its own `logger.once` call site.
*/
const missingReleaseTimestampWarning = "Some release(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding. See debug logs for more information";
/**
* Resolve the config an internal check runs against: merge the
* `updateType`-scoped sub-config in, then apply the `packageRules` which match
* on `updateType`.
*
* Shared by `filterInternalChecks()` and the digest-only check in
* `lookupUpdates()`, so that both resolve `minimumReleaseAge` identically.
*/
async function resolveUpdateTypeConfig(config, updateType) {
	const configWithUpdateType = {
		...config,
		updateType
	};
	const releaseConfig = mergeChildConfig(configWithUpdateType, configWithUpdateType[updateType]);
	return await applyPackageRules(releaseConfig, "update-type");
}
/**
* Checks whether a release satisfies `minimumConfidence`.
*
* Separate from `internalChecksFilter` to allow reuse.
*/
async function checkMinimumConfidence(config, currentVersion, candidateVersion, updateType) {
	const { minimumConfidence, datasource, packageName } = config;
	if (!isActiveConfidenceLevel(minimumConfidence)) return { isPending: false };
	const confidenceLevel = await getMergeConfidenceLevel(datasource, packageName, currentVersion, candidateVersion, updateType) ?? "neutral";
	return { isPending: !satisfiesConfidenceLevel(confidenceLevel, minimumConfidence) };
}
async function filterInternalChecks(config, versioningApi, bucket, sortedReleases) {
	const { currentVersion, depName, internalChecksFilter } = config;
	let release = void 0;
	let pendingChecks = false;
	let pendingReleases = [];
	if (internalChecksFilter === "none") release = sortedReleases.pop();
	else {
		const candidateVersionsWithoutReleaseTimestamp = {
			"timestamp-required": [],
			"timestamp-optional": []
		};
		for (let candidateRelease of sortedReleases.reverse()) {
			const releaseConfig = await resolveUpdateTypeConfig(mergeChildConfig(config, candidateRelease), classifyRelease(versioningApi, currentVersion, candidateRelease.version));
			const updatedCandidateRelease = await postprocessRelease(releaseConfig, candidateRelease);
			if (!updatedCandidateRelease) continue;
			candidateRelease = updatedCandidateRelease;
			const { updateType } = releaseConfig;
			const ageCheck = checkMinimumReleaseAge(releaseConfig, candidateRelease.releaseTimestamp);
			if (ageCheck.minimumReleaseAgeMs) {
				if (!ageCheck.hasTimestamp) {
					const minimumReleaseAgeBehaviour = releaseConfig.minimumReleaseAgeBehaviour;
					// v8 ignore else -- TODO: add test #40625
					if (minimumReleaseAgeBehaviour === "timestamp-required" || minimumReleaseAgeBehaviour === "timestamp-optional") candidateVersionsWithoutReleaseTimestamp[minimumReleaseAgeBehaviour].push(candidateRelease.version);
				}
				if (ageCheck.isPending) {
					// v8 ignore else -- TODO: add test #40625
					if (ageCheck.hasTimestamp) logger.trace({
						depName,
						check: "minimumReleaseAge"
					}, `Release ${candidateRelease.version} is pending status checks`);
					pendingReleases.unshift(candidateRelease);
					continue;
				}
			}
			if ((await checkMinimumConfidence(releaseConfig, currentVersion, candidateRelease.version, updateType)).isPending) {
				logger.trace({
					depName,
					check: "minimumConfidence"
				}, `Release ${candidateRelease.version} is pending status checks`);
				pendingReleases.unshift(candidateRelease);
				continue;
			}
			release = candidateRelease;
			break;
		}
		if (candidateVersionsWithoutReleaseTimestamp["timestamp-required"].length) logger.once.debug({
			depName,
			versions: candidateVersionsWithoutReleaseTimestamp["timestamp-required"],
			check: "minimumReleaseAge"
		}, `Marking ${candidateVersionsWithoutReleaseTimestamp["timestamp-required"].length} release(s) as pending, as they do not have a releaseTimestamp and we're running with minimumReleaseAgeBehaviour=timestamp-required`);
		if (candidateVersionsWithoutReleaseTimestamp["timestamp-optional"].length) {
			logger.once.warn(missingReleaseTimestampWarning);
			logger.once.debug({
				depName,
				versions: candidateVersionsWithoutReleaseTimestamp["timestamp-optional"],
				check: "minimumReleaseAge"
			}, `${candidateVersionsWithoutReleaseTimestamp["timestamp-optional"].length} release(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding`);
		}
		// v8 ignore else -- TODO: add test #40625
		if (!release && pendingReleases.length) {
			logger.trace({
				depName,
				bucket
			}, "All releases are pending - using latest");
			release = pendingReleases.pop();
			pendingReleases = [];
			if (internalChecksFilter === "strict") pendingChecks = true;
		}
	}
	return {
		release,
		pendingChecks,
		pendingReleases
	};
}
//#endregion
export { checkMinimumConfidence, filterInternalChecks, missingReleaseTimestampWarning, resolveUpdateTypeConfig };

//# sourceMappingURL=filter-checks.js.map