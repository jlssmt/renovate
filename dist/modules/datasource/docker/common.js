import { PAGE_NOT_FOUND_ERROR } from "../../../constants/error-messages.js";
import { coerceObject } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, parseUrl, trimTrailingSlash } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { detectPlatform } from "../../../util/common.js";
import { toSha256 } from "../../../util/hash.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { api } from "../../versioning/docker/index.js";
import { refusedHostMessage } from "../../../util/http/util.js";
import { parseGitUrl } from "../../../util/git/url.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { getGoogleAuthToken } from "../util.js";
import { BearerScheme, parse } from "../../../util/http/www-authenticate.js";
import { ecrRegex, getECRAuthToken, isECRMaxResultsResponse } from "./ecr.js";
import { googleRegex } from "./google.js";
import { RegistryAuthToken } from "./schema.js";
import { isNonEmptyString, isString, isUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/docker/common.ts
const dockerDatasourceId = "docker";
const imageUrlLabel = "org.opencontainers.image.url";
const sourceLabel = "org.opencontainers.image.source";
const sourceLabels = [sourceLabel, "org.label-schema.vcs-url"];
const gitRefLabel = "org.opencontainers.image.revision";
const DOCKER_HUB = "https://index.docker.io";
function isDockerHost(host) {
	return regEx(/(?:^|\.)docker\.io$/).test(host);
}
async function getAuthHeaders(http, registryHost, dockerRepository, apiCheckUrl = `${registryHost}/v2/`) {
	try {
		const options = {
			throwHttpErrors: false,
			noAuth: true,
			cacheProvider: memCacheProvider
		};
		let apiCheckResponse;
		if (apiCheckUrl.endsWith("/v2/")) apiCheckResponse = await http.get(apiCheckUrl, options);
		else apiCheckResponse = await http.getJsonUnchecked(apiCheckUrl, options);
		if (apiCheckResponse.statusCode === 200) {
			logger.debug(`No registry auth required for ${apiCheckUrl}`);
			return {};
		}
		if (apiCheckResponse.statusCode === 404) {
			logger.debug(`Page Not Found ${apiCheckUrl}`);
			throw new Error(PAGE_NOT_FOUND_ERROR);
		}
		if (isECRMaxResultsResponse(apiCheckResponse)) {
			logger.debug({ apiCheckUrl }, "Registry rejected n>1000 on auth probe; retrying auth check via base /v2/ endpoint");
			return getAuthHeaders(http, registryHost, dockerRepository);
		}
		if (apiCheckResponse.statusCode !== 401 || !isNonEmptyString(apiCheckResponse.headers["www-authenticate"])) {
			logger.warn({
				apiCheckUrl,
				res: apiCheckResponse
			}, "Invalid registry response");
			return;
		}
		const rule = find({
			hostType: dockerDatasourceId,
			url: apiCheckUrl
		});
		const opts = {};
		if (ecrRegex.test(registryHost)) {
			logger.once.debug(`hostRules: ecr auth for ${registryHost}`);
			logger.trace({
				registryHost,
				dockerRepository
			}, `Using ecr auth for Docker registry`);
			const [, region] = coerceArray(ecrRegex.exec(registryHost));
			const auth = await getECRAuthToken(region, rule);
			if (auth) opts.headers = { authorization: `Basic ${auth}` };
		} else if (googleRegex.test(registryHost) && isUndefined(rule.username) && isUndefined(rule.password) && isUndefined(rule.token)) {
			logger.once.debug(`hostRules: google auth for ${registryHost}`);
			logger.trace({
				registryHost,
				dockerRepository
			}, `Using google auth for Docker registry`);
			const auth = await getGoogleAuthToken();
			if (auth) opts.headers = { authorization: `Basic ${auth}` };
			else logger.once.debug({
				registryHost,
				dockerRepository
			}, "Could not get Google access token, using no auth");
		} else if (rule.username && rule.password) {
			logger.once.debug(`hostRules: basic auth for ${registryHost}`);
			logger.trace({
				registryHost,
				dockerRepository
			}, `Using basic auth for Docker registry`);
			opts.headers = { authorization: `Basic ${Buffer.from(`${rule.username}:${rule.password}`).toString("base64")}` };
		} else if (rule.token) {
			const authType = rule.authType ?? "Bearer";
			logger.once.debug(`hostRules: ${authType} token auth for ${registryHost}`);
			logger.trace({
				registryHost,
				dockerRepository
			}, `Using ${authType} token for Docker registry`);
			opts.headers = { authorization: `${authType} ${rule.token}` };
		}
		const authenticateHeader = parse(apiCheckResponse.headers["www-authenticate"]).find((c) => c.scheme === BearerScheme);
		if (!authenticateHeader || !isString(authenticateHeader.params?.realm) || parseUrl(authenticateHeader.params.realm) === null) {
			logger.once.debug(`hostRules: testing direct auth for ${registryHost}`);
			logger.trace({
				registryHost,
				dockerRepository,
				authenticateHeader
			}, `Invalid realm, testing direct auth`);
			return opts.headers ?? void 0;
		}
		const authUrl = parseUrl(`${authenticateHeader.params.realm}`);
		if (isString(authenticateHeader.params.scope) && !apiCheckUrl.endsWith("/v2/")) authUrl.searchParams.append("scope", authenticateHeader.params.scope);
		else authUrl.searchParams.append("scope", `repository:${dockerRepository}:pull`);
		if (isString(authenticateHeader.params.service)) authUrl.searchParams.append("service", authenticateHeader.params.service);
		logger.trace({
			registryHost,
			dockerRepository,
			authUrl: authUrl.href
		}, `Obtaining docker registry token`);
		opts.noAuth = true;
		opts.cacheProvider = memCacheProvider;
		const authResponse = (await http.getJson(authUrl.href, opts, RegistryAuthToken)).body;
		const token = authResponse.token ?? authResponse.access_token;
		/* v8 ignore next -- TODO: add test */
		if (!token) {
			logger.warn("Failed to obtain docker registry token");
			return;
		}
		addSecretForSanitizing(token);
		return { authorization: `Bearer ${token}` };
	} catch (err) /* istanbul ignore next */ {
		/* v8 ignore if -- quay.io errors are swallowed pending #9604, not reproduced in specs */
		if (err.host === "quay.io") return;
		/* v8 ignore if -- registry auth rejection is logged and swallowed, not mocked in specs */
		if (err.statusCode === 401) {
			logger.debug({
				registryHost,
				dockerRepository
			}, "Unauthorized docker lookup");
			logger.debug({ err });
			return;
		}
		/* v8 ignore if -- registry permission rejection is logged and swallowed, not mocked in specs */
		if (err.statusCode === 403) {
			logger.debug({
				registryHost,
				dockerRepository
			}, "Not allowed to access docker registry");
			logger.debug({ err });
			return;
		}
		if (err.name === "RequestError" && isDockerHost(registryHost)) throw new ExternalHostError(err);
		/* v8 ignore if -- Docker Hub rate limiting maps to ExternalHostError, not mocked in specs */
		if (err.statusCode === 429 && isDockerHost(registryHost)) throw new ExternalHostError(err);
		/* v8 ignore if -- registry server errors map to ExternalHostError, not mocked in specs */
		if (err.statusCode >= 500 && err.statusCode < 600) throw new ExternalHostError(err);
		if (err.message === "page-not-found") throw err;
		/* v8 ignore if -- hostRules-disabled host is swallowed silently, not mocked in specs */
		if (["host-blocked", "host-disabled"].includes(err.message)) {
			logger.trace({
				registryHost,
				dockerRepository,
				err
			}, refusedHostMessage(err));
			return;
		}
		logger.warn({
			registryHost,
			dockerRepository,
			err
		}, "Error obtaining docker token");
		return;
	}
}
function getRegistryRepository(packageName, registryUrl) {
	if (registryUrl !== "https://index.docker.io") {
		const registryEndingWithSlash = ensureTrailingSlash(registryUrl.replace(regEx(/^https?:\/\//), ""));
		if (packageName.startsWith(registryEndingWithSlash)) {
			let registryHost = trimTrailingSlash(registryUrl);
			if (!regEx(/^https?:\/\//).test(registryHost)) registryHost = `https://${registryHost}`;
			let dockerRepository = packageName.replace(registryEndingWithSlash, "");
			const fullUrl = `${registryHost}/${dockerRepository}`;
			const parsedFullUrl = parseUrl(fullUrl);
			if (!parsedFullUrl) return {
				registryHost,
				dockerRepository
			};
			registryHost = parsedFullUrl.origin;
			dockerRepository = parsedFullUrl.pathname.substring(1);
			return {
				registryHost,
				dockerRepository
			};
		}
	}
	let registryHost = registryUrl;
	const split = packageName.split("/");
	if (split.length > 1 && (split[0].includes(".") || split[0].includes(":"))) {
		[registryHost] = split;
		split.shift();
	}
	let dockerRepository = split.join("/");
	if (!regEx(/^https?:\/\//).test(registryHost)) registryHost = `https://${registryHost}`;
	const { path, base } = coerceObject(regEx(/^(?<base>https:\/\/[^/]+)\/(?<path>.+)$/).exec(registryHost)?.groups);
	if (base && path) {
		registryHost = base;
		dockerRepository = `${trimTrailingSlash(path)}/${dockerRepository}`;
	}
	registryHost = registryHost.replace("https://docker.io", "https://index.docker.io").replace("https://registry-1.docker.io", "https://index.docker.io");
	if (find({
		hostType: "docker",
		url: registryHost
	})?.insecureRegistry) registryHost = registryHost.replace("https", "http");
	if (registryHost.endsWith(".docker.io") && !dockerRepository.includes("/")) dockerRepository = `library/${dockerRepository}`;
	return {
		registryHost,
		dockerRepository
	};
}
function extractDigestFromResponseBody(manifestResponse) {
	return `sha256:${toSha256(manifestResponse.body)}`;
}
function findLatestStable(tags) {
	let stable = null;
	for (const tag of tags) {
		if (!api.isValid(tag) || !api.isStable(tag)) continue;
		if (!stable || api.isGreaterThan(tag, stable)) stable = tag;
	}
	return stable;
}
const chartRepo = regEx(/charts?|helm|helm-charts?/i);
function isPossibleChartRepo(url) {
	if (detectPlatform(url) === null) return false;
	const parsed = parseGitUrl(url);
	return chartRepo.test(parsed.name);
}
function findHelmSourceUrl(release) {
	if (release.home && isPossibleChartRepo(release.home)) return release.home;
	if (!release.sources?.length) return null;
	for (const url of release.sources) if (isPossibleChartRepo(url)) return url;
	return release.sources[0];
}
//#endregion
export { DOCKER_HUB, dockerDatasourceId, extractDigestFromResponseBody, findHelmSourceUrl, findLatestStable, getAuthHeaders, getRegistryRepository, gitRefLabel, imageUrlLabel, isDockerHost, sourceLabel, sourceLabels };

//# sourceMappingURL=common.js.map