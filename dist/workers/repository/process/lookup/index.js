import "../../../../constants/error-messages.js";
import { regEx } from "../../../../util/regex.js";
import { safeStringify } from "../../../../util/stringify.js";
import { logger } from "../../../../logger/index.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import { ExternalHostError } from "../../../../types/errors/external-host-error.js";
import "../../../../modules/versioning/docker/index.js";
import { get } from "../../../../modules/versioning/index.js";
import { Result } from "../../../../util/result.js";
import { assignKeys } from "../../../../util/assign-keys.js";
import { getElapsedDays } from "../../../../util/date.js";
import { getDatasourceFor, getDefaultVersioning, isGetPkgReleasesConfig } from "../../../../modules/datasource/common.js";
import { applyDatasourceFilters, getRawPkgReleases, supportsDigests } from "../../../../modules/datasource/index.js";
import "../../../../config/index.js";
import { applyPackageRules } from "../../../../util/package-rules/index.js";
import { postprocessRelease } from "../../../../modules/datasource/postprocess-release.js";
import { calculateAbandonment } from "./abandonment.js";
import { groupReleasesIntoBuckets } from "./bucket.js";
import { getNewestMatchingVersion, resolveCurrentVersion } from "./current.js";
import { filterInternalChecks } from "./filter-checks.js";
import { applyMinimumReleaseAgeToDigestUpdate, couldApplyMinimumReleaseAgeToDigest, resolveUpdateDigests } from "./digest.js";
import { filterVersions } from "./filter.js";
import { generateUpdate } from "./generate.js";
import { resolveRangeStrategy } from "./range-strategy.js";
import { getRollbackUpdate } from "./rollback.js";
import { calculateMostRecentTimestamp } from "./timestamps.js";
import { addReplacementUpdateIfValid, isReplacementRulesConfigured, stripNoopUpdates } from "./utils.js";
import { matchVersionCompatibility, restoreVersionCompatibility } from "./version-compatibility.js";
import { applyVulnerabilityFixFilter } from "./vulnerability.js";
import { isNonEmptyString, isString, isUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/process/lookup/index.ts
async function getTimestamp(config, versions, version, versioningApi) {
	const currentRelease = versions.find((v) => versioningApi.isValid(v.version) && versioningApi.equals(v.version, version));
	if (!currentRelease) return null;
	if (currentRelease.releaseTimestamp) return currentRelease.releaseTimestamp;
	return (await postprocessRelease(config, currentRelease))?.releaseTimestamp;
}
async function lookupUpdates(inconfig) {
	let config = { ...inconfig };
	config.versioning ??= getDefaultVersioning(config.datasource);
	const versioningApi = get(config.versioning);
	let dependency = null;
	const res = {
		versioning: config.versioning,
		updates: [],
		warnings: []
	};
	let newestMatchingVersionTimestamp;
	let digestUpdate;
	try {
		logger.trace({
			dependency: config.packageName,
			currentValue: config.currentValue
		}, "lookupUpdates");
		if (config.currentValue && !isString(config.currentValue)) {
			logger.debug(`Invalid currentValue for ${config.packageName}: ${safeStringify(config.currentValue)} (${typeof config.currentValue})`);
			res.skipReason = "invalid-value";
			return Result.ok(res);
		}
		if (!isGetPkgReleasesConfig(config) || !getDatasourceFor(config.datasource)) {
			res.skipReason = "invalid-config";
			return Result.ok(res);
		}
		let compareValue = config.isLockfileOnly && config.lockedVersion ? config.lockedVersion : config.currentValue;
		const versionCompatibilityMatch = matchVersionCompatibility(config);
		if (versionCompatibilityMatch) {
			compareValue = versionCompatibilityMatch.compareValue;
			config.currentCompatibility = versionCompatibilityMatch.currentCompatibility;
			res.currentCompatibility = versionCompatibilityMatch.currentCompatibility;
		}
		const isValid = isString(compareValue) && versioningApi.isValid(compareValue);
		const unconstrainedValue = !!config.lockedVersion && isUndefined(config.currentValue);
		if (isValid || unconstrainedValue) {
			if (!config.updatePinnedDependencies && !config.isLockfileOnly && versioningApi.isSingleVersion(compareValue)) {
				res.skipReason = "is-pinned";
				return Result.ok(res);
			}
			const { val: releaseResult, err: lookupError } = await getRawPkgReleases(config).transform((res) => calculateMostRecentTimestamp(versioningApi, res)).transform((res) => calculateAbandonment(res, config)).transform((res) => applyDatasourceFilters(res, config)).unwrap();
			if (lookupError instanceof Error) throw lookupError;
			if (lookupError) {
				const warning = {
					topic: config.packageName,
					message: `Failed to look up ${config.datasource} package ${config.packageName}: ${lookupError}`
				};
				logger.debug({
					dependency: config.packageName,
					packageFile: config.packageFile
				}, warning.message);
				res.warnings.push(warning);
				return Result.ok(res);
			}
			dependency = releaseResult;
			if (dependency.deprecationMessage) logger.debug(`Found deprecationMessage for ${config.datasource} package ${config.packageName}`);
			assignKeys(res, dependency, [
				"deprecationMessage",
				"sourceUrl",
				"registryUrl",
				"sourceDirectory",
				"homepage",
				"changelogUrl",
				"dependencyUrl",
				"lookupName",
				"packageScope",
				"mostRecentTimestamp",
				"isAbandoned",
				"respectLatest"
			]);
			const latestVersion = dependency.tags?.latest;
			let allVersions = dependency.releases.filter((release) => versioningApi.isVersion(release.version));
			const allReleaseVersions = new Set(allVersions.map((r) => r.version));
			// istanbul ignore if
			if (allVersions.length === 0) {
				logger.info({
					dependency: config.packageName,
					result: dependency
				}, `Found no results from datasource that look like a version`);
				if (!config.currentDigest) return Result.ok(res);
			}
			config = await applyPackageRules({
				...config,
				sourceUrl: res.sourceUrl
			}, "source-url");
			if (config.followTag) {
				const taggedVersion = dependency.tags?.[config.followTag];
				if (!taggedVersion) {
					res.warnings.push({
						topic: config.packageName,
						message: `Can't find version with tag ${config.followTag} for ${config.datasource} package ${config.packageName}`
					});
					return Result.ok(res);
				}
				allVersions = allVersions.filter((v) => v.version === taggedVersion || v.version === compareValue && versioningApi.isGreaterThan(taggedVersion, compareValue));
			}
			const inRangeOnlyStrategy = config.rangeStrategy === "in-range-only";
			const allSatisfyingVersions = (inRangeOnlyStrategy || config.rollbackPrs) && !unconstrainedValue ? allVersions.filter((v) => versioningApi.matches(v.version, compareValue)) : allVersions;
			if (!allSatisfyingVersions.length) logger.debug(`Found no satisfying versions with '${config.versioning}' versioning`);
			if (config.rollbackPrs && !allSatisfyingVersions.length) {
				const rollback = getRollbackUpdate(config, allVersions, versioningApi);
				// istanbul ignore if
				if (!rollback) {
					res.warnings.push({
						topic: config.packageName,
						message: `Can't find version matching ${compareValue} for ${config.datasource} package ${config.packageName}`
					});
					return Result.ok(res);
				}
				res.updates.push(rollback);
			}
			let rangeStrategy = resolveRangeStrategy(config);
			const currentVersion = resolveCurrentVersion(compareValue, config.lockedVersion, versioningApi, rangeStrategy, latestVersion, allVersions);
			if (!currentVersion) {
				// v8 ignore else -- TODO: add test #40625
				if (!config.lockedVersion) {
					logger.debug(`No currentVersion or lockedVersion found for ${config.packageName}`);
					res.skipReason = "invalid-value";
				}
				return Result.ok(res);
			}
			res.currentVersion = currentVersion;
			const versionForTimestamp = config.lockedVersion ?? currentVersion;
			const currentVersionTimestamp = await getTimestamp(config, allVersions, versionForTimestamp, versioningApi);
			if (isNonEmptyString(currentVersionTimestamp)) {
				res.currentVersionTimestamp = currentVersionTimestamp;
				res.currentVersionAgeInDays = getElapsedDays(currentVersionTimestamp);
				if (config.packageRules?.some((rule) => isNonEmptyString(rule.matchCurrentAge))) config = await applyPackageRules({
					...config,
					currentVersionTimestamp
				}, "current-timestamp");
			}
			if (config.currentDigest ? couldApplyMinimumReleaseAgeToDigest(config, "digest") : config.pinDigests && couldApplyMinimumReleaseAgeToDigest(config, "pinDigest")) {
				const newestMatchingVersion = getNewestMatchingVersion(compareValue, versioningApi, latestVersion, allVersions);
				if (newestMatchingVersion) newestMatchingVersionTimestamp = await getTimestamp(config, allVersions, newestMatchingVersion, versioningApi);
			}
			if (compareValue && currentVersion && rangeStrategy === "pin" && !versioningApi.isSingleVersion(compareValue)) {
				const newValue = versioningApi.getPinnedValue?.(currentVersion) ?? currentVersion;
				res.updates.push({
					updateType: "pin",
					isPin: true,
					newValue,
					newVersion: currentVersion,
					newMajor: versioningApi.getMajor(currentVersion)
				});
			}
			if (rangeStrategy === "pin") rangeStrategy = "replace";
			// istanbul ignore if
			if (!versioningApi.isVersion(currentVersion)) {
				res.skipReason = "invalid-version";
				return Result.ok(res);
			}
			let filteredReleases = filterVersions(config, currentVersion, latestVersion, inRangeOnlyStrategy ? allSatisfyingVersions : allVersions, versioningApi).filter((v) => {
				if (config.isLockfileOnly) return true;
				return unconstrainedValue || versioningApi.isCompatible(v.version, compareValue);
			});
			const vulnerabilityFix = applyVulnerabilityFixFilter(config, res, versioningApi, filteredReleases);
			filteredReleases = vulnerabilityFix.releases;
			const { shrinkedViaVulnerability } = vulnerabilityFix;
			const buckets = groupReleasesIntoBuckets(config, currentVersion, filteredReleases, versioningApi);
			const depResultConfig = mergeChildConfig(config, res);
			for (const [bucket, releases] of Object.entries(buckets)) {
				const sortedReleases = releases.sort((r1, r2) => versioningApi.sortVersions(r1.version, r2.version));
				const { release, pendingChecks, pendingReleases } = await filterInternalChecks(depResultConfig, versioningApi, bucket, sortedReleases);
				// istanbul ignore next
				if (!release) return Result.ok(res);
				const newVersion = release.version;
				const update = await generateUpdate(config, config.isLockfileOnly ? config.currentValue : compareValue, versioningApi, rangeStrategy, config.lockedVersion ?? currentVersion, bucket, release, allReleaseVersions);
				if (config.manager === "gomod" && compareValue?.startsWith("v0.0.0-") && update.newValue?.startsWith("v0.0.0-") && config.currentDigest !== update.newDigest) {
					update.updateType = "digest";
					await applyMinimumReleaseAgeToDigestUpdate(update, config, res, true, release.releaseTimestamp);
				}
				if (pendingChecks) update.pendingChecks = pendingChecks;
				if (pendingReleases.length) update.pendingVersions = pendingReleases.map((r) => r.version);
				if (!update.newValue || update.newValue === compareValue) {
					if (!config.lockedVersion) continue;
					// istanbul ignore if
					if (rangeStrategy === "bump") {
						logger.trace({
							packageName: config.packageName,
							currentValue: config.currentValue,
							lockedVersion: config.lockedVersion,
							newVersion
						}, "Skipping bump because newValue is the same");
						continue;
					}
					res.isSingleVersion = true;
				}
				res.isSingleVersion ??= isString(update.newValue) && versioningApi.isSingleVersion(update.newValue);
				// istanbul ignore if
				if (config.versioning === "docker" && update.updateType !== "rollback" && update.newValue && versioningApi.isVersion(update.newValue) && compareValue && versioningApi.isVersion(compareValue) && versioningApi.isGreaterThan(compareValue, update.newValue)) logger.warn({
					packageName: config.packageName,
					currentValue: config.currentValue,
					compareValue,
					currentVersion: config.currentVersion,
					update,
					allVersionsLength: allVersions.length,
					filteredReleaseVersions: filteredReleases.map((r) => r.version),
					shrinkedViaVulnerability
				}, "Unexpected downgrade detected: skipping");
				else res.updates.push(update);
			}
		} else if (compareValue) {
			logger.debug(`Dependency ${config.packageName} has unsupported/unversioned value ${compareValue} (versioning=${config.versioning})`);
			if (!config.pinDigests && !config.currentDigest) {
				logger.debug(`Skipping ${config.packageName} because no currentDigest or pinDigests`);
				res.skipReason = "invalid-value";
			} else delete res.skipReason;
		} else res.skipReason = "invalid-value";
		if (isReplacementRulesConfigured(config)) addReplacementUpdateIfValid(res.updates, config);
		else if (dependency?.replacementName && dependency.replacementVersion) res.updates.push({
			updateType: "replacement",
			newName: dependency.replacementName,
			newValue: dependency.replacementVersion
		});
		if (config.lockedVersion) {
			res.currentVersion = config.lockedVersion;
			res.fixedVersion = config.lockedVersion;
		} else if (compareValue && versioningApi.isSingleVersion(compareValue)) res.fixedVersion = compareValue.replace(regEx(/^=+/), "");
		restoreVersionCompatibility(config, compareValue, res.updates);
		if (supportsDigests(config.datasource)) {
			if (config.currentDigest) {
				if (!config.digestOneAndOnly || !res.updates.length) {
					digestUpdate = {
						updateType: "digest",
						newValue: config.currentValue
					};
					res.updates.push(digestUpdate);
				}
			} else if (config.pinDigests && !config.digestManagedExternally && 
			// v8 ignore else -- TODO: add test #40625
			!res.updates.some((update) => update.updateType === "pin")) {
				const pinDigestUpdate = {
					isPinDigest: true,
					updateType: "pinDigest",
					newValue: config.currentValue
				};
				await applyMinimumReleaseAgeToDigestUpdate(pinDigestUpdate, config, res, isValid || unconstrainedValue, newestMatchingVersionTimestamp);
				res.updates.push(pinDigestUpdate);
			}
			if (versioningApi.valueToVersion) {
				res.currentVersion = versioningApi.valueToVersion(res.currentVersion);
				for (const update of res.updates) update.newVersion = versioningApi.valueToVersion(update.newVersion);
			}
			if (res.registryUrl) config.registryUrls = [res.registryUrl];
			await resolveUpdateDigests(config, res, dependency);
		}
		if (res.updates.length) delete res.skipReason;
		res.updates = stripNoopUpdates(config, res.updates);
		if (digestUpdate && res.updates.includes(digestUpdate)) await applyMinimumReleaseAgeToDigestUpdate(digestUpdate, config, res, true, newestMatchingVersionTimestamp);
		const release = res.updates.length > 0 ? dependency?.releases.find((r) => r.version === res.updates[0].newValue) ?? dependency?.releases.find((r) => r.version === res.updates[0].newVersion) : null;
		if (release?.changelogContent) {
			res.changelogContent = release.changelogContent;
			res.changelogUrl = release.changelogUrl;
		}
	} catch (err) /* istanbul ignore next */ {
		if (err instanceof ExternalHostError) return Result.err(err);
		if (err instanceof Error && err.message === "config-validation") return Result.err(err);
		logger.error({
			currentDigest: config.currentDigest,
			currentValue: config.currentValue,
			datasource: config.datasource,
			packageName: config.packageName,
			digestOneAndOnly: config.digestOneAndOnly,
			followTag: config.followTag,
			lockedVersion: config.lockedVersion,
			packageFile: config.packageFile,
			pinDigests: config.pinDigests,
			rollbackPrs: config.rollbackPrs,
			isVulnerabilityAlert: config.isVulnerabilityAlert,
			updatePinnedDependencies: config.updatePinnedDependencies,
			err
		}, "lookupUpdates error");
		res.skipReason = "internal-error";
	}
	return Result.ok(res);
}
//#endregion
export { lookupUpdates };

//# sourceMappingURL=index.js.map