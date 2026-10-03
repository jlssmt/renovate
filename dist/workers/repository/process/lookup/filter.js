import { CONFIG_VALIDATION } from "../../../../constants/error-messages.js";
import { getRegexPredicate } from "../../../../util/string-match.js";
import { logger } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import "../../../../modules/versioning/npm/index.js";
import { isValid, matches } from "../../../../modules/versioning/pep440/index.js";
import "../../../../modules/versioning/poetry/index.js";
import semver from "semver";
//#region lib/workers/repository/process/lookup/filter.ts
function isReleaseStable(release, versioningApi) {
	if (!versioningApi.isStable(release.version)) return false;
	if (release.isStable === false) return false;
	return true;
}
function filterByMaxMajorIncrement(releases, currentVersion, maxMajorIncrement, versioningApi, depName) {
	const currentMajor = versioningApi.getMajor(currentVersion);
	/* v8 ignore next -- shouldn't happen */
	if (currentMajor === null) return releases;
	return releases.filter((r) => {
		const releaseMajor = versioningApi.getMajor(r.version);
		/* v8 ignore next -- shouldn't happen */
		if (releaseMajor === null) return true;
		const majorIncrement = releaseMajor - currentMajor;
		if (majorIncrement > maxMajorIncrement) {
			logger.once.debug(`Skipping ${depName}@${r.version} because major increment ${majorIncrement} exceeds maxMajorIncrement ${maxMajorIncrement}`);
			return false;
		}
		return true;
	});
}
function filterVersions(config, currentVersion, latestVersion, releases, versioningApi) {
	const { ignoreUnstable, ignoreDeprecated, respectLatest, maxMajorIncrement } = config;
	/* v8 ignore next -- shouldn't happen */
	if (!currentVersion) return [];
	const versionedReleases = releases.filter((r) => versioningApi.isVersion(r.version));
	let filteredReleases = versionedReleases.filter((r) => versioningApi.isGreaterThan(r.version, currentVersion));
	const currentRelease = versioningApi.isVersion(currentVersion) ? versionedReleases.find((r) => versioningApi.equals(r.version, currentVersion)) : void 0;
	if (ignoreDeprecated && currentRelease && !currentRelease.isDeprecated) filteredReleases = filteredReleases.filter((r) => {
		if (r.isDeprecated) {
			logger.trace(`Skipping ${config.depName}@${r.version} because it is deprecated`);
			return false;
		}
		return true;
	});
	if (maxMajorIncrement && maxMajorIncrement > 0) filteredReleases = filterByMaxMajorIncrement(filteredReleases, currentVersion, maxMajorIncrement, versioningApi, config.depName);
	const currentMajor = versioningApi.getMajor(currentVersion);
	const currentMinor = versioningApi.getMinor(currentVersion);
	const currentPatch = versioningApi.getPatch(currentVersion);
	if (config.allowedVersions) {
		const input = {
			currentVersion,
			major: currentMajor,
			minor: currentMinor,
			patch: currentPatch
		};
		const allowedVersions = compile(config.allowedVersions, input);
		const isAllowedPred = getRegexPredicate(allowedVersions);
		if (isAllowedPred) filteredReleases = filteredReleases.filter(({ version }) => isAllowedPred(version));
		else if (versioningApi.isValid(allowedVersions)) filteredReleases = filteredReleases.filter((r) => versioningApi.matches(r.version, allowedVersions));
		else if (config.versioning !== "npm" && semver.validRange(allowedVersions)) {
			logger.debug({ depName: config.depName }, "Falling back to npm semver syntax for allowedVersions");
			filteredReleases = filteredReleases.filter((r) => semver.satisfies(
				semver.valid(r.version) ? r.version : /* v8 ignore start: only for a version the configured versioning accepts but semver cannot parse, e.g. a four-part docker tag, see #40625 */ semver.coerce(r.version),
				/* v8 ignore stop */
				allowedVersions
			));
		} else if (config.versioning === "poetry" && isValid(allowedVersions)) {
			logger.debug({ depName: config.depName }, "Falling back to pypi syntax for allowedVersions");
			filteredReleases = filteredReleases.filter((r) => matches(r.version, allowedVersions));
		} else {
			const error = new Error(CONFIG_VALIDATION);
			error.validationSource = "config";
			error.validationError = "Invalid `allowedVersions`";
			error.validationMessage = `The following allowedVersions does not parse as a valid version or range with versioning=${JSON.stringify(config.versioning)}: ${JSON.stringify(allowedVersions)}`;
			throw error;
		}
	}
	if (config.followTag) return filteredReleases;
	if (respectLatest && latestVersion && !versioningApi.isGreaterThan(currentVersion, latestVersion)) filteredReleases = filteredReleases.filter((r) => !versioningApi.isGreaterThan(r.version, latestVersion));
	if (!ignoreUnstable) return filteredReleases;
	if (currentRelease && isReleaseStable(currentRelease, versioningApi)) return filteredReleases.filter((r) => isReleaseStable(r, versioningApi));
	return filteredReleases.filter((r) => {
		if (isReleaseStable(r, versioningApi)) return true;
		if (versioningApi.getMajor(r.version) !== currentMajor) return false;
		if (versioningApi.allowUnstableMajorUpgrades) return true;
		const minor = versioningApi.getMinor(r.version);
		const patch = versioningApi.getPatch(r.version);
		return minor === currentMinor && patch === currentPatch;
	});
}
//#endregion
export { filterVersions };

//# sourceMappingURL=filter.js.map