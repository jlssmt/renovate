import { logger } from "../../../../logger/index.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import { getDigest } from "../../../../modules/datasource/index.js";
import "../../../../config/index.js";
import { checkMinimumReleaseAge } from "../../../../util/minimum-release-age.js";
import { missingReleaseTimestampWarning, resolveUpdateTypeConfig } from "./filter-checks.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/digest.ts
/**
* A helper function to allow a short-circuit for `minimumReleaseAge` functionality if a package may have config that applies it.
*
* Allows avoiding unnecessary calls to more expensive checks like merge + `applyPackageRules()` and `getTimestamp()`.
*/
function couldApplyMinimumReleaseAgeToDigest(config, updateType) {
	if (config.internalChecksFilter === "none") return false;
	return isNonEmptyString(config.minimumReleaseAge) || isNonEmptyString(config[updateType]?.minimumReleaseAge) || !!config.packageRules?.some((rule) => isNonEmptyString(rule.minimumReleaseAge));
}
/**
* Ensure `minimumReleaseAge`/`internalChecksFilter` applies to digest/pinDigest updates, as they don't currently get run through `filterInternalChecks()`.
*/
async function applyMinimumReleaseAgeToDigestUpdate(update, config, res, currentVersionWasResolved, newestMatchingVersionTimestamp) {
	if (!couldApplyMinimumReleaseAgeToDigest(config, update.updateType)) return;
	if (update.updateType === "pinDigest" && !currentVersionWasResolved) {
		logger.once.debug({
			depName: config.depName,
			updateType: update.updateType
		}, `Skipping minimumReleaseAge check for ${update.updateType} update of ${config.depName}, as its current value does not resolve to a versioned release`);
		return;
	}
	const releaseConfig = await resolveUpdateTypeConfig(mergeChildConfig(config, res), update.updateType);
	const ageCheck = checkMinimumReleaseAge(releaseConfig, newestMatchingVersionTimestamp);
	if (ageCheck.minimumReleaseAgeMs && !ageCheck.hasTimestamp) {
		if (releaseConfig.minimumReleaseAgeBehaviour === "timestamp-optional") logger.once.warn(missingReleaseTimestampWarning);
		logger.once.debug({
			depName: config.depName,
			updateType: update.updateType,
			minimumReleaseAgeBehaviour: releaseConfig.minimumReleaseAgeBehaviour,
			check: "minimumReleaseAge"
		}, `${update.updateType} update of ${config.depName} has no releaseTimestamp to age against`);
	}
	if (ageCheck.isPending) {
		logger.trace({
			depName: config.depName,
			updateType: update.updateType,
			releaseTimestamp: newestMatchingVersionTimestamp,
			check: "minimumReleaseAge"
		}, `${update.updateType} update is pending minimumReleaseAge status checks`);
		if (config.internalChecksFilter === "strict") update.pendingChecks = true;
	}
}
function getDigestInputConfig(config, res, update) {
	const getDigestConfig = {
		...config,
		registryUrl: update.registryUrl ?? res.registryUrl,
		lookupName: res.lookupName
	};
	if (update.updateType !== "replacement") delete getDigestConfig.replacementName;
	if (update.updateType === "replacement" && update.newName !== config.packageName) {
		delete getDigestConfig.lookupName;
		delete getDigestConfig.currentDigest;
		getDigestConfig.replacementName = update.newName;
	}
	return getDigestConfig;
}
async function resolveUpdateDigest(config, res, dependency, update) {
	if (update.updateType !== "replacement" || update.newName === config.packageName) update.newDigest ??= dependency?.releases.find((r) => r.version === update.newValue)?.newDigest;
	update.newDigest ??= await getDigest(getDigestInputConfig(config, res, update), update.newValue);
	if (update.newDigest === null) {
		logger.debug({
			packageName: config.packageName,
			currentValue: config.currentValue,
			datasource: config.datasource,
			newValue: update.newValue,
			bucket: update.bucket
		}, "Could not determine new digest for update.");
		if (config.currentDigest) res.warnings.push({
			message: `Could not determine new digest for update (${config.datasource} package ${config.packageName})`,
			topic: config.packageName
		});
	}
}
/**
* Fill in `newDigest` (and, where a release came from another registry,
* `registryUrl`) for every update.
*/
async function resolveUpdateDigests(config, res, dependency) {
	for (const update of res.updates) {
		if (config.pinDigests === true && !config.digestManagedExternally || config.currentDigest) await resolveUpdateDigest(config, res, dependency, update);
		else delete update.newDigest;
		if (update.newVersion) {
			const registryUrl = dependency?.releases?.find((release) => release.version === update.newVersion)?.registryUrl;
			if (registryUrl && registryUrl !== res.registryUrl) update.registryUrl = registryUrl;
		}
	}
}
//#endregion
export { applyMinimumReleaseAgeToDigestUpdate, couldApplyMinimumReleaseAgeToDigest, resolveUpdateDigests };

//# sourceMappingURL=digest.js.map