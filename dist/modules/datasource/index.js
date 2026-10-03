import "../../constants/error-messages.js";
import { get, set } from "../../util/cache/memory/index.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceArray } from "../../util/array.js";
import { safeStringify } from "../../util/stringify.js";
import { logger } from "../../logger/index.js";
import { clone } from "../../util/clone.js";
import { trimTrailingSlash } from "../../util/url.js";
import { ATTR_RENOVATE_DATASOURCE, ATTR_RENOVATE_PACKAGE_NAME, ATTR_RENOVATE_REGISTRY_URL } from "../../instrumentation/types.js";
import { DatasourceCacheStats } from "../../util/stats.js";
import { instrument } from "../../instrumentation/index.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { filterMap } from "../../util/filter-map.js";
import { get as get$1 } from "../versioning/index.js";
import { get as get$2, set as set$1 } from "../../util/cache/package/index.js";
import { AsyncResult, Result } from "../../util/result.js";
import { resolveRegistryUrl, setNpmrc } from "./npm/npmrc.js";
import "./npm/index.js";
import { addMetaData } from "./metadata.js";
import api from "./api.js";
import { applyConstraintsFiltering, applyExtractVersion, applyVersionCompatibility, filterValidVersions, getDatasourceFor, isGetPkgReleasesConfig, sortAndRemoveDuplicates } from "./common.js";
import { isNonEmptyArray, isString, isTruthy } from "@sindresorhus/is";
import { dequal } from "dequal";
import { ATTR_CODE_FUNCTION_NAME } from "@opentelemetry/semantic-conventions";
//#region lib/modules/datasource/index.ts
function getDatasources() {
	return api;
}
function getDatasourceList() {
	return Array.from(api.keys());
}
function logError(datasource, packageName, err) {
	const { statusCode, code: errCode, url } = err;
	if (statusCode === 404) logger.debug({
		datasource,
		packageName,
		url
	}, "Datasource 404");
	else if (statusCode === 401 || statusCode === 403) logger.debug({
		datasource,
		packageName,
		url
	}, "Datasource unauthorized");
	else if (errCode) logger.debug({
		datasource,
		packageName,
		url,
		errCode
	}, "Datasource connection error");
	else logger.debug({
		datasource,
		packageName,
		err
	}, "Datasource unknown error");
}
async function getRegistryReleases(datasource, config, registryUrl) {
	const cacheNamespace = `datasource-releases-${datasource.id}`;
	const cacheKey = `${registryUrl}:${config.packageName}`;
	const cacheEnabled = !!datasource.caching;
	const cacheForced = GlobalConfig.get("cachePrivatePackages");
	if (cacheEnabled || cacheForced) {
		const cachedResult = await get$2(cacheNamespace, cacheKey);
		if (cachedResult) {
			logger.trace({ cacheKey }, "Returning cached datasource response");
			DatasourceCacheStats.hit(datasource.id, registryUrl, config.packageName);
			return cachedResult;
		}
		DatasourceCacheStats.miss(datasource.id, registryUrl, config.packageName);
	}
	const res = await instrument("getReleases", () => datasource.getReleases({
		...config,
		registryUrl
	}), { attributes: {
		[ATTR_CODE_FUNCTION_NAME]: "getReleases",
		[ATTR_RENOVATE_DATASOURCE]: datasource.id,
		[ATTR_RENOVATE_REGISTRY_URL]: registryUrl,
		[ATTR_RENOVATE_PACKAGE_NAME]: config.packageName
	} });
	if (res?.releases.length) res.registryUrl ??= registryUrl;
	if (!res) return null;
	let cache = false;
	if (cacheForced) cache = true;
	else if (cacheEnabled && !res.isPrivate) cache = true;
	if (cache) {
		logger.trace({ cacheKey }, "Caching datasource response");
		await set$1(cacheNamespace, cacheKey, res, 15);
		DatasourceCacheStats.set(datasource.id, registryUrl, config.packageName);
	} else DatasourceCacheStats.skip(datasource.id, registryUrl, config.packageName);
	return res;
}
function firstRegistry(config, datasource, registryUrls) {
	if (registryUrls.length > 1) logger.warn({
		datasource: datasource.id,
		packageName: config.packageName,
		registryUrls
	}, "Excess registryUrls found for datasource lookup - using first configured only");
	const registryUrl = registryUrls[0];
	return getRegistryReleases(datasource, config, registryUrl);
}
async function huntRegistries(config, datasource, registryUrls) {
	let res = null;
	let caughtError;
	for (const registryUrl of registryUrls) try {
		res = await getRegistryReleases(datasource, config, registryUrl);
		if (res) break;
	} catch (err) {
		if (err instanceof ExternalHostError) throw err;
		caughtError = err;
		logger.trace({ err }, "datasource hunt failure");
	}
	if (res) return res;
	if (caughtError) throw caughtError;
	return null;
}
async function mergeRegistries(config, datasource, registryUrls) {
	let combinedRes;
	let lastErr;
	let externalHostError;
	let singleRegistry = true;
	const releaseVersioning = get$1(config.versioning);
	for (const registryUrl of registryUrls) try {
		const res = clone(await getRegistryReleases(datasource, config, registryUrl));
		if (!res) continue;
		if (!combinedRes) {
			combinedRes = res;
			continue;
		}
		if (singleRegistry) {
			for (const release of coerceArray(combinedRes.releases)) release.registryUrl ??= combinedRes.registryUrl;
			singleRegistry = false;
		}
		const releases = coerceArray(res.releases);
		for (const release of releases) release.registryUrl ??= res.registryUrl;
		combinedRes.releases.push(...releases);
		let tags = combinedRes.tags;
		if (tags) {
			// v8 ignore else -- needs merged registries where only one carries tags
			if (res.tags) for (const tag of ["release", "latest"]) {
				const existingTag = combinedRes?.tags?.[tag];
				const newTag = res.tags?.[tag];
				// v8 ignore else -- needs a merged registry whose tag is not a version
				if (isString(newTag) && releaseVersioning.isVersion(newTag)) {
					if (isString(existingTag) && releaseVersioning.isVersion(existingTag)) {
						if (releaseVersioning.isGreaterThan(newTag, existingTag)) tags[tag] = newTag;
					} else tags[tag] = newTag;
				}
			}
		} else tags = res.tags;
		combinedRes = {
			...res,
			...combinedRes
		};
		if (tags) combinedRes.tags = tags;
		delete combinedRes.registryUrl;
	} catch (err) {
		if (err instanceof ExternalHostError) {
			externalHostError = err;
			logger.debug({
				err,
				registryUrl
			}, "datasource merge: external host error from registry; continuing so releases from other registries are not discarded");
			continue;
		}
		lastErr = err;
		logger.trace({ err }, "datasource merge failure");
	}
	if (!combinedRes) {
		if (externalHostError) throw externalHostError;
		if (lastErr) throw lastErr;
		return null;
	}
	const seenVersions = /* @__PURE__ */ new Set();
	combinedRes.releases = filterMap(combinedRes.releases, (release) => {
		if (seenVersions.has(release.version)) return null;
		seenVersions.add(release.version);
		return release;
	});
	return combinedRes;
}
function massageRegistryUrls(registryUrls) {
	return registryUrls.filter(isTruthy).map(trimTrailingSlash);
}
function resolveRegistryUrls(datasource, packageName, defaultRegistryUrls, registryUrls, additionalRegistryUrls) {
	const customRegistrySupport = datasource.supportsCustomRegistry(packageName);
	const datasourceDefaultRegistryUrls = datasource.getDefaultRegistryUrls(packageName);
	if (!customRegistrySupport) {
		if (isNonEmptyArray(registryUrls) || isNonEmptyArray(defaultRegistryUrls) || isNonEmptyArray(additionalRegistryUrls)) logger.warn({
			datasource: datasource.id,
			registryUrls,
			defaultRegistryUrls,
			additionalRegistryUrls
		}, "Custom registries are not allowed for this datasource and will be ignored");
		return coerceArray(datasourceDefaultRegistryUrls);
	}
	const customUrls = registryUrls?.filter(isTruthy);
	let resolvedUrls = [];
	if (isNonEmptyArray(customUrls)) resolvedUrls = [...customUrls];
	else if (isNonEmptyArray(defaultRegistryUrls)) {
		resolvedUrls = [...defaultRegistryUrls];
		resolvedUrls = resolvedUrls.concat(coerceArray(additionalRegistryUrls));
	} else if (isNonEmptyArray(datasourceDefaultRegistryUrls)) {
		resolvedUrls = [...datasourceDefaultRegistryUrls];
		resolvedUrls = resolvedUrls.concat(coerceArray(additionalRegistryUrls));
	}
	return massageRegistryUrls(resolvedUrls);
}
function applyReplacements(config) {
	if (config.replacementName && config.replacementVersion) return {
		replacementName: config.replacementName,
		replacementVersion: config.replacementVersion
	};
}
async function fetchReleases(config) {
	const { datasource: datasourceName } = config;
	let { registryUrls } = config;
	// istanbul ignore if: need test
	if (!datasourceName || getDatasourceFor(datasourceName) === void 0) {
		logger.warn({ datasource: datasourceName }, "Unknown datasource");
		return null;
	}
	if (datasourceName === "npm") {
		if (isString(config.npmrc)) setNpmrc(config.npmrc);
		// v8 ignore else -- npm lookups here never arrive with explicit registryUrls
		if (!isNonEmptyArray(registryUrls)) registryUrls = [resolveRegistryUrl(config.packageName)];
	}
	const datasource = getDatasourceFor(datasourceName);
	// istanbul ignore if: needs test
	if (!datasource) {
		logger.warn({ datasource: datasourceName }, "Unknown datasource");
		return null;
	}
	registryUrls = resolveRegistryUrls(datasource, config.packageName, config.defaultRegistryUrls, registryUrls, config.additionalRegistryUrls);
	let dep = null;
	const registryStrategy = config.registryStrategy ?? datasource.registryStrategy ?? "hunt";
	try {
		if (isNonEmptyArray(registryUrls)) {
			if (registryStrategy === "first") dep = await firstRegistry(config, datasource, registryUrls);
			else if (registryStrategy === "hunt") dep = await huntRegistries(config, datasource, registryUrls);
			else dep = await mergeRegistries(config, datasource, registryUrls);
		} else dep = await instrument("getReleases", () => datasource.getReleases(config), { attributes: {
			[ATTR_CODE_FUNCTION_NAME]: "getReleases",
			[ATTR_RENOVATE_DATASOURCE]: datasource.id,
			[ATTR_RENOVATE_REGISTRY_URL]: config.registryUrl ?? "",
			[ATTR_RENOVATE_PACKAGE_NAME]: config.packageName
		} });
	} catch (err) {
		if (["host-blocked", "host-disabled"].includes(err.message) || ["host-blocked", "host-disabled"].includes(err.err?.message)) return null;
		if (err instanceof ExternalHostError) throw err;
		logError(datasource.id, config.packageName, err);
	}
	if (!dep || dequal(dep, { releases: [] })) return null;
	addMetaData(dep, datasourceName, config.packageName);
	dep = {
		...dep,
		...applyReplacements(config)
	};
	return dep;
}
function fetchCachedReleases(config) {
	const { datasource, packageName, registryUrls } = config;
	const cacheKey = `datasource-mem:releases:${datasource}:${packageName}:${config.registryStrategy}:${safeStringify([
		registryUrls,
		config.defaultRegistryUrls,
		config.additionalRegistryUrls
	])}`;
	const cachedResult = get(cacheKey);
	// istanbul ignore if
	if (cachedResult !== void 0) return cachedResult;
	const promisedRes = fetchReleases(config);
	set(cacheKey, promisedRes);
	return promisedRes;
}
function getRawPkgReleases(config) {
	if (!config.datasource) {
		logger.warn("No datasource found");
		return AsyncResult.err("no-datasource");
	}
	const packageName = config.packageName;
	if (!packageName) {
		logger.error({ config }, "Datasource getReleases without packageName");
		return AsyncResult.err("no-package-name");
	}
	return Result.wrapNullable(fetchCachedReleases(config), "no-result").catch((e) => {
		if (e instanceof ExternalHostError) {
			e.hostType = config.datasource;
			e.packageName = packageName;
		}
		return Result.err(e);
	}).transform(clone);
}
function applyDatasourceFilters(releaseResult, config) {
	let res = releaseResult;
	res = applyExtractVersion(res, config.extractVersion);
	res = applyVersionCompatibility(res, config.versionCompatibility, config.currentCompatibility);
	res = filterValidVersions(res, config);
	res = sortAndRemoveDuplicates(res, config);
	res = applyConstraintsFiltering(res, config);
	return res;
}
async function getPkgReleases(config) {
	const { val = null, err } = await getRawPkgReleases(config).transform((res) => applyDatasourceFilters(res, config)).unwrap();
	if (err instanceof Error) throw err;
	return val;
}
function supportsDigests(datasource) {
	const ds = !!datasource && getDatasourceFor(datasource);
	return !!ds && "getDigest" in ds;
}
function getDigestConfig(datasource, config) {
	const { lookupName, currentValue, currentDigest } = config;
	const packageName = config.replacementName ?? config.packageName;
	return {
		lookupName,
		packageName,
		registryUrl: config.registryUrl ?? resolveRegistryUrls(datasource, packageName, config.defaultRegistryUrls, config.registryUrls, config.additionalRegistryUrls)[0],
		currentValue,
		currentDigest
	};
}
function getDigest(config, value) {
	const datasource = getDatasourceFor(config.datasource);
	// istanbul ignore if: need test
	if (!datasource || !("getDigest" in datasource)) return Promise.resolve(null);
	const digestConfig = getDigestConfig(datasource, config);
	return datasource.getDigest(digestConfig, value);
}
function getDefaultConfig(datasource) {
	const loadedDatasource = getDatasourceFor(datasource);
	return Promise.resolve(loadedDatasource?.defaultConfig ?? Object.create({}));
}
//#endregion
export { applyDatasourceFilters, getDatasourceList, getDatasources, getDefaultConfig, getDigest, getPkgReleases, getRawPkgReleases, isGetPkgReleasesConfig, supportsDigests };

//# sourceMappingURL=index.js.map