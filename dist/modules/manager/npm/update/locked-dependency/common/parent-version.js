import { logger } from "../../../../../../logger/index.js";
import { api } from "../../../../../versioning/npm/index.js";
import { getPkgReleases } from "../../../../../datasource/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/common/parent-version.ts
const pkgCache = /* @__PURE__ */ new Map();
function getPkgReleasesCached(packageName) {
	let cachedResult = pkgCache.get(packageName);
	if (!cachedResult) {
		cachedResult = getPkgReleases({
			datasource: "npm",
			packageName
		});
		pkgCache.set(packageName, cachedResult);
	}
	return cachedResult;
}
/**
* Finds the first stable version of parentName after parentStartingVersion which either:
* - depends on targetDepName@targetVersion or a range which it satisfies, OR
* - removes the dependency targetDepName altogether, OR
* - depends on any version of targetDepName higher than targetVersion
*/
async function findFirstParentVersion(parentName, parentStartingVersion, targetDepName, targetVersion) {
	/* v8 ignore next -- needs test */
	if (!api.isVersion(parentStartingVersion)) {
		logger.debug("parentStartingVersion is not a version - cannot remediate");
		return null;
	}
	logger.debug(`Finding first version of ${parentName} starting with ${parentStartingVersion} which supports >= ${targetDepName}@${targetVersion}`);
	try {
		const targetDep = await getPkgReleasesCached(targetDepName);
		/* v8 ignore next -- needs test */
		if (!targetDep) {
			logger.info({ targetDepName }, "Could not look up target dependency for remediation");
			return null;
		}
		const targetVersions = targetDep.releases.map((release) => release.version).filter((version) => api.isVersion(version) && api.isStable(version) && (version === targetVersion || api.isGreaterThan(version, targetVersion)));
		const parentDep = await getPkgReleasesCached(parentName);
		/* v8 ignore next -- needs test */
		if (!parentDep) {
			logger.info({ parentName }, "Could not look up parent dependency for remediation");
			return null;
		}
		const parentVersions = parentDep.releases.map((release) => release.version).filter((version) => api.isVersion(version) && api.isStable(version) && (version === parentStartingVersion || api.isGreaterThan(version, parentStartingVersion))).sort((v1, v2) => api.sortVersions(v1, v2));
		for (const parentVersion of parentVersions) {
			const constraint = parentDep.releases.find((release) => release.version === parentVersion)?.dependencies?.[targetDepName];
			if (!constraint) {
				logger.debug(`${targetDepName} has been removed from ${parentName}@${parentVersion}`);
				return parentVersion;
			}
			if (api.matches(targetVersion, constraint)) {
				logger.debug(`${targetDepName} needs ${parentName}@${parentVersion} which uses constraint "${constraint}" in order to update to ${targetVersion}`);
				return parentVersion;
			}
			if (api.isVersion(constraint)) {
				if (api.isGreaterThan(constraint, targetVersion)) {
					logger.debug(`${targetDepName} needs ${parentName}@${parentVersion} which uses version "${constraint}" in order to update to greater than ${targetVersion}`);
					return parentVersion;
				}
			} else if (targetVersions.some((version) => api.matches(version, constraint))) {
				logger.debug(`${targetDepName} needs ${parentName}@${parentVersion} which uses constraint "${constraint}" in order to update to greater than ${targetVersion}`);
				return parentVersion;
			}
		}
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({
			parentName,
			parentStartingVersion,
			targetDepName,
			targetVersion,
			err
		}, "findFirstParentVersion error");
		return null;
	}
	logger.debug(`Could not find a matching version`);
	return null;
}
//#endregion
export { findFirstParentVersion };

//# sourceMappingURL=parent-version.js.map