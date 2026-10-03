import { logger } from "../../../../../logger/index.js";
import { instrument } from "../../../../../instrumentation/index.js";
import { get } from "../../../../../modules/versioning/index.js";
import { isGetPkgReleasesConfig } from "../../../../../modules/datasource/common.js";
import { getPkgReleases } from "../../../../../modules/datasource/index.js";
//#region lib/workers/repository/update/pr/changelog/releases.ts
function matchesMMP(versioningApi, v1, v2) {
	return versioningApi.getMajor(v1) === versioningApi.getMajor(v2) && versioningApi.getMinor(v1) === versioningApi.getMinor(v2) && versioningApi.getPatch(v1) === versioningApi.getPatch(v2);
}
function matchesUnstable(versioningApi, v1, v2) {
	return !versioningApi.isStable(v1) && matchesMMP(versioningApi, v1, v2);
}
async function getInRangeReleases(config) {
	return await instrument(`getInRangeReleases`, async () => {
		const versioning = config.versioning;
		const currentVersion = config.currentVersion;
		const newVersion = config.newVersion;
		const depName = config.depName;
		const datasource = config.datasource;
		// istanbul ignore if
		if (!isGetPkgReleasesConfig(config)) return null;
		try {
			const pkgReleases = (await getPkgReleases(config)).releases;
			const version = get(versioning);
			const compatibilityVersion = version.valueToVersion ? config.currentValue ?? currentVersion : currentVersion;
			const previousReleases = pkgReleases.filter((release) => version.isCompatible(release.version, compatibilityVersion)).map((release) => ({
				...release,
				version: version.valueToVersion?.(release.version) ?? release.version
			})).filter((release) => !version.isGreaterThan(release.version, newVersion)).filter((release) => version.isStable(release.version) || matchesUnstable(version, currentVersion, release.version) || matchesUnstable(version, newVersion, release.version));
			const releases = previousReleases.filter((release) => version.equals(release.version, currentVersion) || version.isGreaterThan(release.version, currentVersion));
			/**
			* If there is only one release, it can be one of two things:
			*
			*   1. There really is only one release
			*
			*   2. Pinned version doesn't actually exist, i.e pinning `^1.2.3` to `1.2.3`
			*      while only `1.2.2` and `1.2.4` exist.
			*/
			if (releases.length === 1) {
				const newRelease = releases[0];
				const closestPreviousRelease = previousReleases.filter((release) => !version.equals(release.version, newVersion)).sort((b, a) => version.sortVersions(a.version, b.version)).shift();
				if (closestPreviousRelease && closestPreviousRelease.version !== newRelease.version) releases.unshift(closestPreviousRelease);
			}
			return releases;
		} catch (err) /* istanbul ignore next */ {
			logger.debug({ err }, "getInRangeReleases err");
			logger.debug(`Error getting releases for ${depName} from ${datasource}`);
			return null;
		}
	});
}
//#endregion
export { getInRangeReleases };

//# sourceMappingURL=releases.js.map