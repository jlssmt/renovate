import { PLATFORM_BAD_CREDENTIALS, PLATFORM_INTEGRATION_UNAUTHORIZED, PLATFORM_RATE_LIMIT_EXCEEDED, REPOSITORY_CHANGED } from "../../constants/error-messages.js";
import { coerceObject } from "../object.js";
import { getEnv } from "../env.js";
import { regEx } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { joinUrlParts, parseLinkHeader, parseUrl } from "../url.js";
import { find } from "../host-rules.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { LooseArray } from "../schema-utils/index.js";
import { findMatchingRule } from "./host-rules.js";
import { HttpBase } from "./http.js";
import { getCache } from "../cache/repository/index.js";
import { maskToken } from "../mask.js";
import { all } from "../promises.js";
import { range } from "../range.js";
import { isArray, isNonEmptyObject, isNullOrUndefined, isPlainObject, isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
import { z } from "zod/v4";
//#region lib/util/http/github.ts
const githubBaseUrl = "https://api.github.com/";
const MAX_PAGINATION_PAGES = 100;
let baseUrl = githubBaseUrl;
function setBaseUrl(url) {
	baseUrl = url;
}
/**
* GitHub reports a spent GraphQL budget in two shapes: `RATE_LIMITED` from the
* GraphQL API itself, and `graphql_rate_limit` when an app installation has
* exhausted its allowance. Both mean "come back later", not "unknown error".
*/
function isGraphqlRateLimited(errors) {
	return !!errors?.some((err) => err.type === "RATE_LIMITED" || err.code === "graphql_rate_limit");
}
const GithubError = z.object({
	field: z.string().optional(),
	code: z.string().optional(),
	message: z.string().optional()
});
/**
* GitHub usually returns `errors` as an array, but not always - normalize it
* into an array of error objects, dropping anything that doesn't fit.
*/
const GithubErrors = z.union([LooseArray(GithubError), GithubError.transform((error) => [error])]).catch([]);
function handleGotError(err, url, opts) {
	const path = url.toString();
	let message = err.message || "";
	const body = err.response?.body;
	if (isPlainObject(body) && "message" in body) message = String(body.message);
	if (err.code === "ERR_HTTP2_STREAM_ERROR" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT" || err.code === "EAI_AGAIN" || err.code === "ECONNRESET") {
		logger.debug({ err }, "GitHub failure: RequestError");
		return new ExternalHostError(err, "github");
	}
	if (err.name === "ParseError") {
		logger.debug({ err }, "");
		return new ExternalHostError(err, "github");
	}
	if (err.statusCode && err.statusCode >= 500 && err.statusCode < 600) {
		logger.debug({ err }, "GitHub failure: 5xx");
		return new ExternalHostError(err, "github");
	}
	if (err.statusCode === 403 && message.startsWith("You have triggered an abuse detection mechanism")) {
		logger.debug({ err }, "GitHub failure: abuse detection");
		return new Error(PLATFORM_RATE_LIMIT_EXCEEDED);
	}
	if (err.statusCode === 403 && message.startsWith("You have exceeded a secondary rate limit")) {
		logger.warn({ err }, "GitHub failure: secondary rate limit");
		return new Error(PLATFORM_RATE_LIMIT_EXCEEDED);
	}
	if (err.statusCode === 403 && message.includes("Upgrade to GitHub Pro")) {
		logger.debug(`Endpoint: ${path}, needs paid GitHub plan`);
		return err;
	}
	if (err.statusCode === 403 && message.includes("rate limit exceeded")) {
		logger.debug({ err }, "GitHub failure: rate limit");
		const parsed = parseUrl(baseUrl);
		const rule = find({ url: baseUrl });
		if (rule.token || rule.password) logger.once.warn("Rate limit exceeded for api.github.com, even though we are authenticated");
		else if (parsed?.hostname === "api.github.com") logger.once.warn({ documentationUrl: `${GlobalConfig.get("productLinks").documentation}getting-started/running/#githubcom-token-for-changelogs-and-tools` }, "Rate limit exceeded for api.github.com, as no hostRules set for this host. Please set a GITHUB_COM_TOKEN");
		else logger.once.warn({ host: parsed.host }, "Rate limit exceeded, as no hostRules set for this host");
		return new Error(PLATFORM_RATE_LIMIT_EXCEEDED);
	}
	if (err.statusCode === 403 && message.startsWith("Resource not accessible by integration")) {
		logger.debug({ err }, "GitHub failure: Resource not accessible by integration");
		return new Error(PLATFORM_INTEGRATION_UNAUTHORIZED);
	}
	if (err.statusCode === 401) {
		const hostname = parseUrl(url)?.hostname;
		// v8 ignore else -- TODO: add test #40625
		if (hostname === "github.com" || hostname === "api.github.com") logger.once.warn("github.com token 401 unauthorized");
		if (message.includes("Bad credentials")) {
			const rateLimit = err.headers?.["x-ratelimit-limit"] ?? -1;
			logger.debug({
				token: maskToken(opts.token),
				err
			}, "GitHub failure: Bad credentials");
			if (rateLimit === "60") return new ExternalHostError(err, "github");
			return new Error(PLATFORM_BAD_CREDENTIALS);
		}
	}
	if (err.statusCode === 422) {
		if (message.includes("Review cannot be requested from pull request author")) return err;
		const errors = GithubErrors.parse(err.body?.errors);
		if (errors.some((e) => e.field === "milestone")) return err;
		if (errors.some((e) => e.code === "invalid")) {
			logger.debug({ err }, "Received invalid response - aborting");
			return new Error(REPOSITORY_CHANGED);
		}
		if (errors.some((e) => e.message?.startsWith("A pull request already exists"))) return err;
		logger.debug({ err }, "422 Error thrown from GitHub");
		return new ExternalHostError(err, "github");
	}
	if (err.statusCode === 410 && err.body?.message === "Issues are disabled for this repo") return err;
	return err;
}
function constructAcceptString(input) {
	const defaultAccept = "application/vnd.github.v3+json";
	const acceptStrings = isString(input) ? input.split(regEx(/\s*,\s*/)) : [];
	// v8 ignore else -- TODO: add test #40625
	if (!acceptStrings.some((x) => x === defaultAccept) && (!acceptStrings.some((x) => x.startsWith("application/vnd.github.")) || acceptStrings.length < 2)) acceptStrings.push(defaultAccept);
	return acceptStrings.join(", ");
}
const MAX_GRAPHQL_PAGE_SIZE = 100;
function getGraphqlPageSize(fieldName, defaultPageSize = MAX_GRAPHQL_PAGE_SIZE) {
	const graphqlPageCache = getCache()?.platform?.github?.graphqlPageCache;
	const cachedRecord = graphqlPageCache?.[fieldName];
	if (graphqlPageCache && cachedRecord) {
		logger.debug({
			fieldName,
			...cachedRecord
		}, "GraphQL page size: found cached value");
		const oldPageSize = cachedRecord.pageSize;
		const now = DateTime.local();
		if (now > DateTime.fromISO(cachedRecord.pageLastResizedAt).plus({ hours: 24 })) {
			const newPageSize = Math.min(oldPageSize * 2, MAX_GRAPHQL_PAGE_SIZE);
			if (newPageSize < MAX_GRAPHQL_PAGE_SIZE) {
				const timestamp = now.toISO();
				logger.debug({
					fieldName,
					oldPageSize,
					newPageSize,
					timestamp
				}, "GraphQL page size: expanding");
				cachedRecord.pageLastResizedAt = timestamp;
				cachedRecord.pageSize = newPageSize;
			} else {
				logger.debug({
					fieldName,
					oldPageSize,
					newPageSize
				}, "GraphQL page size: expanded to default page size");
				delete graphqlPageCache[fieldName];
			}
			return newPageSize;
		}
		return oldPageSize;
	}
	return defaultPageSize;
}
function setGraphqlPageSize(fieldName, newPageSize) {
	const oldPageSize = getGraphqlPageSize(fieldName);
	if (newPageSize !== oldPageSize) {
		const pageLastResizedAt = DateTime.local().toISO();
		logger.debug({
			fieldName,
			oldPageSize,
			newPageSize,
			timestamp: pageLastResizedAt
		}, "GraphQL page size: shrinking");
		const cache = getCache();
		cache.platform ??= {};
		cache.platform.github ??= {};
		cache.platform.github.graphqlPageCache ??= {};
		const graphqlPageCache = cache.platform.github.graphqlPageCache;
		graphqlPageCache[fieldName] = {
			pageLastResizedAt,
			pageSize: newPageSize
		};
	}
}
function replaceUrlBase(url, baseUrl) {
	const relativeUrl = `${url.pathname}${url.search}`;
	return new URL(relativeUrl, baseUrl);
}
function resolvePaginationUrl(url, baseUrl, rebasePaginationLinks) {
	const parsedUrl = new URL(url, baseUrl);
	return !!baseUrl && rebasePaginationLinks && parsedUrl.origin !== "https://api.github.com" ? replaceUrlBase(parsedUrl, baseUrl) : parsedUrl;
}
var GithubHttp = class extends HttpBase {
	get baseUrl() {
		return baseUrl;
	}
	constructor(hostType = "github", options) {
		super(hostType, options);
	}
	extraOptions() {
		return super.extraOptions().concat([
			"pageLimit",
			"paginate",
			"paginationField",
			"repository"
		]);
	}
	processOptions(url, opts) {
		if (!opts.token) {
			const authUrl = parseUrl(url.toString());
			if (opts.repository) {
				authUrl.hash = "";
				authUrl.search = "";
				authUrl.pathname = joinUrlParts(authUrl.pathname.startsWith("/api/v3") ? "/api/v3" : "", "repos", `${opts.repository}`);
			}
			let readOnly = opts.readOnly;
			const { method = "get" } = opts;
			if (readOnly === void 0 && ["get", "head"].includes(method.toLowerCase())) readOnly = true;
			const { token } = findMatchingRule(authUrl.toString(), {
				hostType: this.hostType,
				readOnly
			});
			opts.token = token;
		}
		const accept = constructAcceptString(opts.headers?.accept);
		opts.headers = {
			...opts.headers,
			accept
		};
	}
	handleError(url, opts, err) {
		throw handleGotError(err, url, opts);
	}
	async requestJsonUnsafe(method, options) {
		const httpOptions = coerceObject(options.httpOptions);
		const resolvedUrl = this.resolveUrl(options.url, httpOptions);
		const opts = {
			...options,
			url: resolvedUrl
		};
		const result = await super.requestJsonUnsafe(method, opts);
		if (httpOptions.paginate) {
			delete httpOptions.cacheProvider;
			httpOptions.memCache = false;
			const pageLimit = httpOptions.pageLimit ?? 10;
			const linkHeader = parseLinkHeader(result?.headers?.link);
			const next = linkHeader?.next;
			const env = getEnv();
			if (next?.url) {
				const baseUrl = httpOptions.baseUrl ?? this.baseUrl;
				const rebasePaginationLinks = !!env.RENOVATE_X_REBASE_PAGINATION_LINKS;
				const firstPageUrl = resolvePaginationUrl(next.url, baseUrl, rebasePaginationLinks);
				if (firstPageUrl.origin === resolvedUrl.origin) {
					let pages;
					if (linkHeader?.last?.page) {
						logger.debug("Using GitHub offset-based pagination");
						let lastPage = parseInt(linkHeader.last.page, 10);
						// v8 ignore else -- TODO: add test #40625
						if (!env.RENOVATE_PAGINATE_ALL && httpOptions.paginate !== "all") lastPage = Math.min(pageLimit, lastPage);
						const queue = [...range(2, lastPage)].map((pageNumber) => () => {
							const nextUrl = parseUrl(firstPageUrl.toString());
							nextUrl.searchParams.set("page", String(pageNumber));
							return super.requestJsonUnsafe(method, {
								...opts,
								url: nextUrl
							});
						});
						pages = await all(queue);
					} else {
						logger.debug("Using GitHub cursor-based pagination");
						pages = [];
						const paginateAll = !!env.RENOVATE_PAGINATE_ALL || httpOptions.paginate === "all";
						const cursorPageLimit = paginateAll ? MAX_PAGINATION_PAGES : pageLimit;
						let nextUrl = firstPageUrl;
						let pageNumber = 2;
						for (; nextUrl && pageNumber <= cursorPageLimit; pageNumber += 1) {
							if (nextUrl.origin !== resolvedUrl.origin) {
								logger.once.warn({
									requestOrigin: resolvedUrl.origin,
									paginationOrigin: nextUrl.origin
								}, "Ignoring cross-origin GitHub pagination link. Set RENOVATE_X_REBASE_PAGINATION_LINKS if this is a self-hosted instance that returns a different origin in pagination links.");
								break;
							}
							const nextPage = await super.requestJsonUnsafe(method, {
								...opts,
								url: nextUrl
							});
							pages.push(nextPage);
							const nextLink = parseLinkHeader(nextPage.headers.link)?.next;
							nextUrl = nextLink?.url ? resolvePaginationUrl(nextLink.url, baseUrl, rebasePaginationLinks) : null;
						}
						if (paginateAll && nextUrl && pageNumber > cursorPageLimit) logger.warn({ maxPages: MAX_PAGINATION_PAGES }, "GitHub cursor pagination limit reached");
					}
					// v8 ignore else -- TODO: add test #40625
					if (httpOptions.paginationField && isPlainObject(result.body)) {
						const paginatedResult = result.body[httpOptions.paginationField];
						// v8 ignore else -- TODO: add test #40625
						if (isArray(paginatedResult)) {
							for (const nextPage of pages)
 // v8 ignore else -- TODO: add test #40625
							if (isPlainObject(nextPage.body)) {
								const nextPageResults = nextPage.body[httpOptions.paginationField];
								// v8 ignore else -- TODO: add test #40625
								if (isArray(nextPageResults)) paginatedResult.push(...nextPageResults);
							}
						}
					} else if (isArray(result.body)) {
						for (const nextPage of pages)
 // v8 ignore else -- TODO: add test #40625
						if (isArray(nextPage.body)) result.body.push(...nextPage.body);
					}
				} else logger.once.warn({
					requestOrigin: resolvedUrl.origin,
					paginationOrigin: firstPageUrl.origin
				}, "Ignoring cross-origin GitHub pagination link. Set RENOVATE_X_REBASE_PAGINATION_LINKS if this is a self-hosted instance that returns a different origin in pagination links.");
			}
		}
		return result;
	}
	async requestGraphql(query, options = {}) {
		const path = "graphql";
		const { paginate, count = MAX_GRAPHQL_PAGE_SIZE, cursor = null } = options;
		let { variables } = options;
		if (paginate) variables = {
			...variables,
			count,
			cursor
		};
		const body = variables ? {
			query,
			variables
		} : { query };
		const opts = {
			baseUrl: baseUrl.replace("/v3/", "/"),
			body,
			headers: { accept: options?.acceptHeader },
			readOnly: options.readOnly
		};
		if (options.token) opts.token = options.token;
		logger.trace(`Performing Github GraphQL request`);
		let response;
		try {
			response = (await this.postJson(path, opts)).body;
		} catch (err) {
			logger.debug({
				err,
				query,
				options
			}, "Unexpected GraphQL Error");
			if (err instanceof ExternalHostError && count && count > 10) {
				logger.info("Reducing pagination count to workaround graphql errors");
				return null;
			}
			throw handleGotError(err, path, opts);
		}
		if (isGraphqlRateLimited(response?.errors)) throw new Error(PLATFORM_RATE_LIMIT_EXCEEDED);
		return response;
	}
	async queryRepoField(query, fieldName, options = {}) {
		const result = [];
		const { paginate = true } = options;
		let optimalCount = null;
		let count = getGraphqlPageSize(fieldName, options.count ?? MAX_GRAPHQL_PAGE_SIZE);
		let limit = options.limit ?? 1e3;
		let cursor = null;
		let isIterating = true;
		while (isIterating) {
			const res = await this.requestGraphql(query, {
				...options,
				count: Math.min(count, limit),
				cursor,
				paginate
			});
			const repositoryData = res?.data?.repository;
			if (isNonEmptyObject(repositoryData) && !isNullOrUndefined(repositoryData[fieldName])) {
				optimalCount = count;
				const { nodes = [], edges = [], pageInfo } = repositoryData[fieldName];
				result.push(...nodes);
				result.push(...edges);
				limit = Math.max(0, limit - nodes.length - edges.length);
				if (limit === 0) isIterating = false;
				else if (paginate && pageInfo) {
					const { hasNextPage, endCursor } = pageInfo;
					if (hasNextPage && endCursor) cursor = endCursor;
					else isIterating = false;
				}
			} else {
				count = Math.floor(count / 2);
				if (count === 0) {
					logger.warn({
						query,
						options,
						res
					}, "Error fetching GraphQL nodes");
					isIterating = false;
				}
			}
			if (!paginate) isIterating = false;
		}
		if (optimalCount && optimalCount < MAX_GRAPHQL_PAGE_SIZE) setGraphqlPageSize(fieldName, optimalCount);
		return result;
	}
	/**
	* Get the raw text file from a URL.
	* Only use this method to fetch text files.
	*
	* @param url Full API URL, contents path or path inside the repository to the file
	* @param options
	*
	* @example url = 'https://api.github.com/repos/renovatebot/renovate/contents/package.json'
	* @example url = 'renovatebot/renovate/contents/package.json'
	* @example url = 'package.json' & options.repository = 'renovatebot/renovate'
	*/
	async getRawTextFile(url, options = {}) {
		const newOptions = {
			...options,
			headers: { accept: "application/vnd.github.raw+json" }
		};
		let newURL = url;
		const httpRegex = regEx(/^https?:\/\//);
		if (options.repository && !httpRegex.test(options.repository)) newURL = joinUrlParts(options.repository, "contents", url);
		return await this.getText(newURL, newOptions);
	}
};
//#endregion
export { GithubHttp, setBaseUrl };

//# sourceMappingURL=github.js.map