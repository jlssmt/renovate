import { regEx } from "../../util/regex.js";
import { logger } from "../../logger/index.js";
import { isAdditionalConstraintName } from "../../util/exec/types.js";
import { filterMap } from "../../util/filter-map.js";
import { defaultVersioning, get } from "../versioning/index.js";
import { CustomDatasource } from "./custom/index.js";
import api from "./api.js";
import { isNonEmptyArray, isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/modules/datasource/common.ts
function getDatasourceFor(datasource) {
	if (datasource?.startsWith("custom.")) return getDatasourceFor(CustomDatasource.id);
	return api.get(datasource) ?? null;
}
function getDefaultVersioning(datasourceName) {
	if (!datasourceName) return defaultVersioning.id;
	const datasource = getDatasourceFor(datasourceName);
	if (!datasource) {
		logger.warn({ datasourceName }, "Missing datasource!");
		return defaultVersioning.id;
	}
	if (!datasource.defaultVersioning) return defaultVersioning.id;
	return datasource.defaultVersioning;
}
function isGetPkgReleasesConfig(input) {
	return isNonEmptyStringAndNotWhitespace(input.datasource) && isNonEmptyStringAndNotWhitespace(input.packageName);
}
function applyVersionCompatibility(releaseResult, versionCompatibility, currentCompatibility) {
	if (!versionCompatibility) return releaseResult;
	const versionCompatibilityRegEx = regEx(versionCompatibility);
	releaseResult.releases = filterMap(releaseResult.releases, (release) => {
		const regexResult = versionCompatibilityRegEx.exec(release.version);
		if (!regexResult?.groups?.version) {
			logger.trace({
				releaseVersion: release.version,
				versionCompatibility
			}, "versionCompatibility: Does not match regex");
			return null;
		}
		if (regexResult?.groups?.compatibility !== currentCompatibility) {
			logger.trace({
				releaseVersion: release.version,
				versionCompatibility
			}, "versionCompatibility: Does not match compatibility");
			return null;
		}
		logger.trace({
			releaseVersion: release.version,
			versionCompatibility,
			version: regexResult.groups.version,
			compatibility: regexResult.groups.compatibility
		}, "versionCompatibility: matches");
		release.versionOrig ??= release.version;
		release.version = regexResult.groups.version;
		return release;
	});
	return releaseResult;
}
function applyExtractVersion(releaseResult, extractVersion) {
	if (!extractVersion) return releaseResult;
	const extractVersionRegEx = regEx(extractVersion);
	releaseResult.releases = filterMap(releaseResult.releases, (release) => {
		const version = extractVersionRegEx.exec(release.version)?.groups?.version;
		if (!version) return null;
		release.versionOrig = release.version;
		release.version = version;
		return release;
	});
	return releaseResult;
}
function filterValidVersions(releaseResult, config) {
	const versioningName = config.versioning ?? getDefaultVersioning(config.datasource);
	const versioning = get(versioningName);
	releaseResult.releases = filterMap(releaseResult.releases, (release) => versioning.isVersion(release.version) ? release : null);
	return releaseResult;
}
function sortAndRemoveDuplicates(releaseResult, config) {
	const versioningName = config.versioning ?? getDefaultVersioning(config.datasource);
	const versioning = get(versioningName);
	releaseResult.releases = releaseResult.releases.sort((a, b) => versioning.sortVersions(a.version, b.version));
	let previousVersion = null;
	releaseResult.releases = filterMap(releaseResult.releases, (release) => {
		if (previousVersion === release.version) return null;
		previousVersion = release.version;
		return release;
	});
	return releaseResult;
}
function applyConstraintsFiltering(releaseResult, config) {
	if (config?.constraintsFiltering !== "strict") {
		for (const release of releaseResult.releases) delete release.constraints;
		return releaseResult;
	}
	const versioningName = config.versioning ?? getDefaultVersioning(config.datasource);
	const versioning = get(versioningName);
	const configConstraints = config.constraints;
	const filteredReleases = [];
	const startingLength = releaseResult.releases.length;
	releaseResult.releases = filterMap(releaseResult.releases, (release) => {
		logger.trace({
			release,
			versioning: versioningName
		}, `applyConstraintsFiltering(${release.version})`);
		const releaseConstraints = release.constraints;
		delete release.constraints;
		logger.trace({
			release,
			versioning: versioningName,
			configConstraints: configConstraints ?? "undefined",
			releaseConstraints: releaseConstraints ?? "undefined"
		}, `applyConstraintsFiltering(${release.version}): checking constraints`);
		if (!configConstraints || !releaseConstraints) return release;
		for (const [name, configConstraint] of Object.entries(configConstraints)) {
			let constraintVersioningName = versioningName;
			if (isAdditionalConstraintName(name) && config.constraintsVersioning?.[name]) {
				const val = config.constraintsVersioning[name];
				logger.once.debug({
					packageName: config.packageName,
					release
				}, `applyConstraintsFiltering(${config.packageName}, ${name}): overriding constraintsVersioning from ${constraintVersioningName} to ${val}`);
				logger.trace({
					packageName: config.packageName,
					release
				}, `applyConstraintsFiltering(${release.version}): overriding constraintsVersioning from ${constraintVersioningName} to ${val}`);
				constraintVersioningName = val;
			}
			const constraintVersioning = get(constraintVersioningName);
			logger.trace({
				release,
				versioning: constraintVersioningName,
				constraintName: name,
				constraint: configConstraint
			}, `applyConstraintsFiltering(${release.version}) for constraint ${name}`);
			const isValid = constraintVersioning.isValid(configConstraint);
			logger.trace({
				release,
				versioning: constraintVersioningName
			}, `applyConstraintsFiltering(${release.version}): versioning.isValid(${configConstraint})=${isValid}`);
			if (!isValid) {
				logger.once.warn({
					packageName: config.packageName,
					constraint: configConstraint,
					versioning: constraintVersioningName
				}, "Invalid constraint used with strict constraintsFiltering");
				continue;
			}
			const constraint = releaseConstraints[name];
			logger.trace({
				release,
				versioning: constraintVersioningName
			}, `applyConstraintsFiltering(${release.version}): releaseConstraints[${name}]=${JSON.stringify(constraint)}`);
			if (!isNonEmptyArray(constraint)) continue;
			let satisfiesConstraints = false;
			for (const releaseConstraint of constraint) {
				logger.trace({
					release,
					versioning: constraintVersioningName,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): releaseConstraint=${releaseConstraint}`);
				if (!releaseConstraint) {
					satisfiesConstraints = true;
					logger.once.debug({
						packageName: config.packageName,
						versioning: constraintVersioningName,
						constraint: releaseConstraint
					}, "Undefined release constraint");
					break;
				}
				const isValidConstraintVersion = constraintVersioning.isValid(releaseConstraint);
				logger.trace({
					release,
					versioning: constraintVersioningName,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): constraintVersioning.isValid(${releaseConstraint})=${isValidConstraintVersion}`);
				const isValidVersion = versioning.isValid(releaseConstraint);
				logger.trace({
					release,
					versioning: constraintVersioningName,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): versioning.isValid(${releaseConstraint})=${isValidVersion}`);
				if (!isValidVersion || !isValidConstraintVersion) {
					logger.once.debug({
						packageName: config.packageName,
						versioning: constraintVersioningName,
						constraint: releaseConstraint
					}, "Invalid release constraint");
					break;
				}
				const isEqual = configConstraint === releaseConstraint;
				logger.trace({
					release,
					versioning: constraintVersioningName,
					configConstraint,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): ${configConstraint} === ${releaseConstraint}=${isEqual}`);
				if (isEqual) {
					satisfiesConstraints = true;
					break;
				}
				const isSubset = constraintVersioning.subset?.(configConstraint, releaseConstraint);
				logger.trace({
					release,
					versioning: constraintVersioningName,
					configConstraint,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): versioning.subset?.(${configConstraint}, ${releaseConstraint})=${isSubset}`);
				if (isSubset) {
					satisfiesConstraints = true;
					break;
				}
				const doesMatchConfig = constraintVersioning.matches(configConstraint, releaseConstraint);
				logger.trace({
					release,
					versioning: constraintVersioningName,
					configConstraint,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): versioning.matches(${configConstraint}, ${releaseConstraint})=${doesMatchConfig}`);
				const doesMatchRelease = constraintVersioning.matches(releaseConstraint, configConstraint);
				logger.trace({
					release,
					versioning: constraintVersioningName,
					configConstraint,
					releaseConstraint
				}, `applyConstraintsFiltering(${release.version}): versioning.matches(${releaseConstraint}, ${configConstraint})=${doesMatchRelease}`);
				if (doesMatchConfig || doesMatchRelease) {
					satisfiesConstraints = true;
					break;
				}
			}
			logger.trace({
				release,
				versioning: constraintVersioningName
			}, `applyConstraintsFiltering(${release.version}): satisfiesConstraints=${satisfiesConstraints}`);
			if (!satisfiesConstraints) {
				filteredReleases.push(release.version);
				return null;
			}
		}
		return release;
	});
	if (filteredReleases.length) {
		const count = filteredReleases.length;
		const packageName = config.packageName;
		const releases = filteredReleases.join(", ");
		logger.debug({
			datasource: config.datasource,
			packageName: config.packageName
		}, `Filtered out ${count} non-matching releases out of ${startingLength} total for ${packageName} due to constraintsFiltering=strict: ${releases}`);
	}
	return releaseResult;
}
//#endregion
export { applyConstraintsFiltering, applyExtractVersion, applyVersionCompatibility, filterValidVersions, getDatasourceFor, getDefaultVersioning, isGetPkgReleasesConfig, sortAndRemoveDuplicates };

//# sourceMappingURL=common.js.map