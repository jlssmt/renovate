import { getEnv } from "../../util/env.js";
import { addSecretForSanitizing } from "../../util/sanitize.js";
import { logger } from "../../logger/index.js";
import { parseUrl, resolveSameOriginUrl } from "../../util/url.js";
import { isString } from "@sindresorhus/is";
import { GoogleAuth } from "google-auth-library";
//#region lib/modules/datasource/util.ts
const JFROG_ARTIFACTORY_RES_HEADER = "x-jfrog-version";
/**
* Experimental, per-datasource env var that opts a datasource into following
* server-provided pagination links across origins. Each datasource has its own
* flag so relaxing the restriction for one registry cannot weaken the others.
*/
const crossOriginPaginationEnv = {
	docker: "RENOVATE_X_DOCKER_PAGINATION_ALLOW_CROSS_ORIGIN",
	nuget: "RENOVATE_X_NUGET_PAGINATION_ALLOW_CROSS_ORIGIN"
};
/**
* Whether a datasource is opted in to following server-provided pagination
* links across origins, via its experimental `RENOVATE_X_<DATASOURCE>_PAGINATION_ALLOW_CROSS_ORIGIN`
* env var.
*
* By default such links are restricted to the same origin as the request so a
* malicious or compromised registry cannot attempt to redirect our requests in an attempt for Server Side Request Forgery.
*/
function isCrossOriginPaginationAllowed(datasource) {
	const envVar = crossOriginPaginationEnv[datasource];
	return envVar ? !!getEnv()[envVar] : false;
}
/**
* Resolves a server-provided pagination `next` URL against `baseUrl`, returning
* the URL to follow or `null` if it must not be followed.
*
* When `allowCrossOrigin` is false (the default; see
* {@link isCrossOriginPaginationAllowed}) the link is dropped unless it stays on
* the same origin. When true, the link is followed regardless of origin.
*/
function resolvePaginationUrl(baseUrl, nextUrl, allowCrossOrigin) {
	if (!allowCrossOrigin) return resolveSameOriginUrl(baseUrl, nextUrl);
	try {
		const resolved = new URL(nextUrl, baseUrl).href;
		if (parseUrl(baseUrl)?.origin !== parseUrl(resolved)?.origin) logger.once.warn({
			baseUrl,
			nextUrl
		}, "Following cross-origin pagination link");
		return resolved;
	} catch {
		return null;
	}
}
function isArtifactoryServer(res) {
	return isString(res?.headers[JFROG_ARTIFACTORY_RES_HEADER]);
}
/**
* Whether the host is a Google Artifact Registry endpoint, which authenticates with a short-lived Google access token instead of static credentials.
*/
function isGoogleArtifactRegistry(hostname) {
	return hostname.endsWith(".pkg.dev");
}
async function getGoogleAuthHostRule() {
	try {
		const accessToken = await new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" }).getAccessToken();
		if (accessToken) {
			addSecretForSanitizing(accessToken);
			return {
				username: "oauth2accesstoken",
				password: accessToken
			};
		}
		logger.warn("Could not retrieve access token using google-auth-library getAccessToken");
	} catch (err) {
		if (err.message?.includes("Could not load the default credentials")) return null;
		throw err;
	}
	return null;
}
async function getGoogleAuthToken() {
	const rule = await getGoogleAuthHostRule();
	if (rule) {
		const token = Buffer.from(`${rule.username}:${rule.password}`).toString("base64");
		addSecretForSanitizing(token);
		return token;
	}
	return null;
}
//#endregion
export { getGoogleAuthHostRule, getGoogleAuthToken, isArtifactoryServer, isCrossOriginPaginationAllowed, isGoogleArtifactRegistry, resolvePaginationUrl };

//# sourceMappingURL=util.js.map