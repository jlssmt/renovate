import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import { supportedDatasources as supportedDatasources$1 } from "../../config/presets/internal/merge-confidence.preset.js";
import { ensureTrailingSlash, joinUrlParts, parseUrl } from "../url.js";
import { ATTR_RENOVATE_DATASOURCE, ATTR_RENOVATE_PACKAGE_NAME } from "../../instrumentation/types.js";
import { instrument } from "../../instrumentation/index.js";
import { find } from "../host-rules.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { get, set } from "../cache/package/index.js";
import { Http } from "../http/index.js";
import { memCacheProvider } from "../http/cache/memory-http-cache-provider.js";
import { MERGE_CONFIDENCE } from "./common.js";
import { MergeConfidenceResponse } from "./schema.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/util/merge-confidence/index.ts
const hostType = "merge-confidence";
const http = new Http(hostType);
let token;
let apiBaseUrl;
let supportedDatasources = [];
const confidenceLevels = {
	low: -1,
	neutral: 0,
	high: 1,
	"very high": 2
};
function initConfig({ mergeConfidenceEndpoint, mergeConfidenceDatasources }) {
	apiBaseUrl = getApiBaseUrl(mergeConfidenceEndpoint);
	token = getApiToken();
	supportedDatasources = mergeConfidenceDatasources ?? supportedDatasources$1;
	if (!isNullOrUndefined(token)) logger.debug(`Merge confidence token found for ${apiBaseUrl}`);
}
function isMergeConfidence(value) {
	return MERGE_CONFIDENCE.includes(value);
}
function isActiveConfidenceLevel(confidence) {
	return isMergeConfidence(confidence) && confidence !== "low";
}
function satisfiesConfidenceLevel(confidence, minimumConfidence) {
	return confidenceLevels[confidence] >= confidenceLevels[minimumConfidence];
}
const updateTypeConfidenceMapping = {
	pin: "high",
	digest: "neutral",
	pinDigest: "high",
	bump: "neutral",
	lockFileMaintenance: "neutral",
	lockfileUpdate: "neutral",
	rollback: "neutral",
	replacement: "neutral",
	major: null,
	minor: null,
	patch: null
};
/**
* Retrieves the merge confidence of a package update if the merge confidence API is enabled. Otherwise, undefined is returned.
*
* @param datasource
* @param packageName
* @param currentVersion
* @param newVersion
* @param updateType
*
* @returns The merge confidence level for the given package release.
* @throws {ExternalHostError} If a request has been made and an error occurs during the request, such as a timeout, connection reset, authentication failure, or internal server error.
*/
async function getMergeConfidenceLevel(datasource, packageName, currentVersion, newVersion, updateType) {
	return await instrument("getMergeConfidenceLevel", async () => {
		if (isNullOrUndefined(apiBaseUrl) || isNullOrUndefined(token)) return;
		if (!supportedDatasources.includes(datasource)) return;
		if (!(currentVersion && newVersion && updateType)) return "neutral";
		const mappedConfidence = updateTypeConfidenceMapping[updateType];
		if (mappedConfidence) return mappedConfidence;
		return await queryApi(datasource, packageName, currentVersion, newVersion);
	}, { attributes: {
		[ATTR_RENOVATE_DATASOURCE]: datasource,
		[ATTR_RENOVATE_PACKAGE_NAME]: packageName
	} });
}
/**
* Queries the Merge Confidence API with the given package release information.
*
* @param datasource
* @param packageName
* @param currentVersion
* @param newVersion
*
* @returns The merge confidence level for the given package release.
* @throws {ExternalHostError} if a timeout or connection reset error, authentication failure, or internal server error occurs during the request.
*
* @remarks
* Results are cached for 60 minutes to reduce the number of API calls.
*/
async function queryApi(datasource, packageName, currentVersion, newVersion) {
	// istanbul ignore if: defensive, already been validated before calling this function
	if (isNullOrUndefined(apiBaseUrl) || isNullOrUndefined(token)) return "neutral";
	const escapedPackageName = packageName.replace(regEx(/\//g), "%2f").replace(regEx(/:/g), "%3A");
	const url = joinUrlParts(apiBaseUrl, "api/mc/json", datasource, escapedPackageName, currentVersion, newVersion);
	const cacheKey = `${token}:${url}`;
	const cachedResult = await get(hostType, cacheKey);
	// istanbul ignore if
	if (cachedResult) {
		logger.debug({
			datasource,
			packageName,
			currentVersion,
			newVersion,
			cachedResult
		}, "using merge confidence cached result");
		return cachedResult;
	}
	let confidence = "neutral";
	try {
		const res = (await http.getJson(url, { cacheProvider: memCacheProvider }, MergeConfidenceResponse)).body;
		if (isMergeConfidence(res.confidence)) confidence = res.confidence;
	} catch (err) {
		apiErrorHandler(err);
	}
	await set(hostType, cacheKey, confidence, 60);
	return confidence;
}
/**
* Checks the health of the Merge Confidence API by attempting to authenticate with it.
*
* @returns Resolves when the API health check is completed successfully.
*
* @throws {ExternalHostError} if a timeout, connection reset error, authentication failure, or internal server error occurs during the request.
*
* @remarks
* This function first checks that the API base URL and an authentication bearer token are defined before attempting to
* authenticate with the API. If either the base URL or token is not defined, it will immediately return
* without making a request.
*/
async function initMergeConfidence(config) {
	initConfig(config);
	if (isNullOrUndefined(apiBaseUrl) || isNullOrUndefined(token)) {
		logger.trace("merge confidence API usage is disabled");
		return;
	}
	const url = joinUrlParts(apiBaseUrl, "api/mc/availability");
	try {
		await http.get(url);
	} catch (err) {
		apiErrorHandler(err);
	}
	logger.debug({ supportedDatasources }, "merge confidence API - successfully authenticated");
}
function getApiBaseUrl(mergeConfidenceEndpoint) {
	const defaultBaseUrl = "https://developer.mend.io/";
	const baseFromEnv = mergeConfidenceEndpoint ?? defaultBaseUrl;
	const parsedBaseUrl = parseUrl(baseFromEnv)?.toString();
	if (!parsedBaseUrl) {
		logger.warn({ baseFromEnv }, "invalid merge confidence API base URL found in environment variables - using default value instead");
		return defaultBaseUrl;
	}
	logger.trace({ baseUrl: parsedBaseUrl }, "using merge confidence API base found in environment variables");
	return ensureTrailingSlash(parsedBaseUrl);
}
function getApiToken() {
	return find({
		url: apiBaseUrl,
		hostType
	})?.token;
}
/**
* Handles errors returned by the Merge Confidence API.
*
* @param err - The error object returned by the API.
* @throws {ExternalHostError} if a timeout or connection reset error, authentication failure, or internal server error occurs during the request.
*/
function apiErrorHandler(err) {
	if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") {
		logger.error({ err }, "merge confidence API request failed - aborting run");
		throw new ExternalHostError(err, hostType);
	}
	if (err.statusCode === 403) {
		logger.error({ err }, "merge confidence API token rejected - aborting run");
		throw new ExternalHostError(err, hostType);
	}
	if (err.statusCode >= 500 && err.statusCode < 600) {
		logger.error({ err }, "merge confidence API failure: 5xx - aborting run");
		throw new ExternalHostError(err, hostType);
	}
	logger.warn({ err }, "error fetching merge confidence data");
}
//#endregion
export { confidenceLevels, getApiToken, getMergeConfidenceLevel, initConfig, initMergeConfidence, isActiveConfidenceLevel, isMergeConfidence, satisfiesConfidenceLevel };

//# sourceMappingURL=index.js.map