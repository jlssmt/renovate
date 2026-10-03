import { HOST_DISABLED } from "../../constants/error-messages.js";
import { get, set } from "../cache/memory/index.js";
import { coerceObject } from "../object.js";
import { getEnv } from "../env.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceArray } from "../array.js";
import { logger } from "../../logger/index.js";
import { isHttpUrl, parseUrl, resolveBaseUrl } from "../url.js";
import { ObsoleteCacheHitLogger } from "../stats.js";
import { parseSingleYaml } from "../yaml.js";
import { compile } from "../template/index.js";
import { hash } from "../hash.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { Toml } from "../schema-utils/index.js";
import { acquireLock } from "../mutex.js";
import { fetch, normalize, stream } from "./got.js";
import { Result } from "../result.js";
import { applyAuthorization } from "./auth.js";
import { applyHostGuard } from "./host-guard.js";
import { applyHostRule, findMatchingRule } from "./host-rules.js";
import { getQueue } from "./queue.js";
import { getRetryAfter, wrapWithRetry } from "./retry-after.js";
import { getThrottle } from "./throttle.js";
import { copyResponse } from "./util.js";
import { isPlainObject, isUndefined } from "@sindresorhus/is";
import { ZodType } from "zod/v4";
import merge from "deepmerge";
//#region lib/util/http/http.ts
function applyDefaultHeaders(options) {
	const userAgentTemplate = GlobalConfig.get("userAgent");
	options.headers = {
		...options.headers,
		"user-agent": compile(userAgentTemplate, {})
	};
}
var HttpBase = class {
	options;
	get baseUrl() {}
	hostType;
	constructor(hostType, options = {}) {
		this.hostType = hostType;
		const retryLimit = getEnv().NODE_ENV === "test" ? 0 : 2;
		this.options = merge(options, {
			method: "get",
			context: { hostType },
			retry: {
				calculateDelay: (retryObject) => this.calculateRetryDelay(retryObject),
				limit: retryLimit,
				maxRetryAfter: 0,
				enforceRetryRules: false
			}
		}, { isMergeableObject: isPlainObject });
	}
	/**
	* Builds the final got options for a request to a given `url`
	*
	* This merges instance options, applies default headers, host rules and authorization, and rejects requests to disabled hosts.
	*
	* Both the `request()` and `stream()` paths must use this single entry point so that policy applied here covers every outbound request.
	*/
	prepareOptions(resolvedUrl, httpOptions) {
		const url = resolvedUrl.toString();
		let options = merge({
			...this.options,
			hostType: this.hostType
		}, httpOptions, { isMergeableObject: isPlainObject });
		applyDefaultHeaders(options);
		if (isUndefined(options.readOnly) && ["head", "get"].includes(options.method.toLowerCase())) options.readOnly = true;
		const hostRule = findMatchingRule(url, options);
		options = applyHostRule(url, options, hostRule);
		if (options.enabled === false) {
			logger.debug(`Host is disabled - rejecting request. HostUrl: ${url}`);
			throw new Error(HOST_DISABLED);
		}
		options = applyAuthorization(options);
		const guard = applyHostGuard(resolvedUrl, options.hostType, hostRule.internalHostGrant, options.responseBecomesConfig);
		options.dnsLookup = guard.dnsLookup;
		options.hooks = {
			...options.hooks,
			beforeRedirect: [...coerceArray(options.hooks?.beforeRedirect), guard.beforeRedirect]
		};
		if (guard.beforeRequest) options.hooks.beforeRequest = [...coerceArray(options.hooks.beforeRequest), guard.beforeRequest];
		return {
			options,
			hostRule
		};
	}
	async request(requestUrl, httpOptions) {
		const resolvedUrl = this.resolveUrl(requestUrl, httpOptions);
		const url = resolvedUrl.toString();
		this.processOptions(resolvedUrl, httpOptions);
		const { options, hostRule } = this.prepareOptions(resolvedUrl, httpOptions);
		const method = options.method.toLowerCase();
		const isReadMethod = ["head", "get"].includes(method);
		logger.trace(`HTTP request: ${method.toUpperCase()} ${url}`);
		const timeout = options.timeout ?? 6e4;
		options.timeout = timeout;
		let cacheProvider;
		if (isReadMethod && options.cacheProvider) cacheProvider = options.cacheProvider;
		const memCacheKey = !process.env.RENOVATE_X_DISABLE_HTTP_MEMCACHE && !cacheProvider && options.memCache !== false && isReadMethod ? hash(`got-${JSON.stringify({
			url,
			headers: options.headers,
			method
		})}`) : null;
		let resPromise = null;
		if (memCacheKey) {
			resPromise = get(memCacheKey);
			/* v8 ignore next: temporary code */
			if (resPromise && !cacheProvider) ObsoleteCacheHitLogger.write(url);
		}
		// v8 ignore else -- TODO: add test #40625
		if (!resPromise) {
			if (cacheProvider) await cacheProvider.setCacheHeaders(method, url, options);
			const startTime = Date.now();
			const httpTask = async () => {
				let releaseLock;
				if (isReadMethod) releaseLock = await acquireLock(`${options.method} ${url}`, "http-mutex", timeout * 2);
				try {
					const cachedResponse = await cacheProvider?.bypassServer(options.method, url);
					if (cachedResponse) return cachedResponse;
					const queueMs = Date.now() - startTime;
					return fetch(url, this._normalizeOptions(options), { queueMs });
				} finally {
					releaseLock?.();
				}
			};
			const throttle = getThrottle(url);
			const throttledTask = throttle ? () => throttle.add(httpTask) : httpTask;
			const queue = getQueue(url);
			const queuedTask = queue ? () => queue.add(throttledTask) : throttledTask;
			const { maxRetryAfter = 60 } = hostRule;
			resPromise = wrapWithRetry(queuedTask, url, getRetryAfter, maxRetryAfter);
			if (memCacheKey) set(memCacheKey, resPromise);
		}
		try {
			const res = await resPromise;
			const deepCopyNeeded = !!memCacheKey && res.statusCode !== 304;
			const resCopy = copyResponse(res, deepCopyNeeded);
			resCopy.authorization = !!options?.headers?.authorization;
			this.handleResponse(resolvedUrl, resCopy);
			if (cacheProvider) return await cacheProvider.wrapServerResponse(method, url, resCopy);
			return resCopy;
		} catch (err) {
			const { abortOnError, abortIgnoreStatusCodes } = options;
			if (abortOnError && !abortIgnoreStatusCodes?.includes(err.statusCode)) throw new ExternalHostError(err);
			const staleResponse = await cacheProvider?.bypassServer(method, url, true);
			if (staleResponse) {
				logger.debug({ err }, `Request error: returning stale cache instead for ${url}`);
				return staleResponse;
			}
			this.handleError(requestUrl, httpOptions, err);
		}
	}
	_normalizeOptions(options) {
		return normalize(options, this.extraOptions());
	}
	/**
	* Returns Renovate extra options which needs to be removed before passing to got.
	* @returns extra Renovate options.
	*/
	extraOptions() {
		return [
			"baseUrl",
			"cacheProvider",
			"readOnly",
			"responseBecomesConfig"
		];
	}
	processOptions(_url, _options) {}
	handleError(_url, _httpOptions, err) {
		throw err;
	}
	handleResponse(_url, _res) {}
	resolveUrl(requestUrl, options) {
		let url = requestUrl;
		if (url instanceof URL) return url;
		const baseUrl = options?.baseUrl ?? this.baseUrl;
		if (baseUrl) url = resolveBaseUrl(baseUrl, url);
		const parsedUrl = parseUrl(url);
		if (!parsedUrl || !isHttpUrl(parsedUrl)) {
			logger.error({
				url: requestUrl,
				baseUrl,
				resolvedUrl: url
			}, "Request Error: cannot parse url");
			throw new Error("Invalid URL");
		}
		return parsedUrl;
	}
	calculateRetryDelay({ computedValue }) {
		return computedValue;
	}
	get(url, options = {}) {
		return this.request(url, options);
	}
	head(url, options = {}) {
		return this.request(url, {
			...options,
			responseType: "text",
			method: "head"
		});
	}
	getText(url, options = {}) {
		return this.request(url, {
			...options,
			responseType: "text"
		});
	}
	getBuffer(url, options = {}) {
		return this.request(url, {
			...options,
			responseType: "buffer"
		});
	}
	requestJsonUnsafe(method, { url, httpOptions: requestOptions }) {
		const { body: json, ...httpOptions } = { ...requestOptions };
		const opts = {
			...httpOptions,
			method
		};
		opts.headers = {
			accept: "application/json",
			...opts.headers
		};
		if (json) opts.json = json;
		return this.request(url, {
			...opts,
			responseType: "json"
		});
	}
	async requestJson(method, options) {
		const res = await this.requestJsonUnsafe(method, options);
		if (options.schema) res.body = await options.schema.parseAsync(res.body);
		return res;
	}
	resolveArgs(arg1, arg2, arg3) {
		const res = { url: arg1 };
		if (arg2 instanceof ZodType) res.schema = arg2;
		else if (arg2) res.httpOptions = arg2;
		if (arg3) res.schema = arg3;
		return res;
	}
	async getPlain(url, options) {
		const opt = coerceObject(options);
		return await this.getText(url, {
			headers: { Accept: "text/plain" },
			...opt
		});
	}
	/**
	* @deprecated use `getYaml` instead
	*/
	async getYamlUnchecked(url, options) {
		const res = await this.getText(url, options);
		const body = parseSingleYaml(res.body);
		return {
			...res,
			body
		};
	}
	async getYaml(arg1, arg2, arg3) {
		const url = arg1;
		let schema;
		let httpOptions;
		if (arg3) {
			schema = arg3;
			httpOptions = arg2;
		} else schema = arg2;
		const opts = {
			...httpOptions,
			method: "get"
		};
		const res = await this.getText(url, opts);
		const body = await schema.parseAsync(parseSingleYaml(res.body));
		return {
			...res,
			body
		};
	}
	getYamlSafe(arg1, arg2, arg3) {
		const url = arg1;
		let schema;
		let httpOptions;
		if (arg3) {
			schema = arg3;
			httpOptions = arg2;
		} else schema = arg2;
		let res;
		if (httpOptions) res = Result.wrap(this.getYaml(url, httpOptions, schema));
		else res = Result.wrap(this.getYaml(url, schema));
		return res.transform((response) => Result.ok(response.body));
	}
	/**
	* Request JSON and return the response without any validation.
	*
	* The usage of this method is discouraged, please use `getJson` instead.
	*
	* If you're new to Zod schema validation library:
	* - consult the [documentation of Zod library](https://github.com/colinhacks/zod?tab=readme-ov-file#basic-usage)
	* - search the Renovate codebase for 'zod' module usage
	* - take a look at the `schema-utils.ts` file for Renovate-specific schemas and utilities
	*/
	getJsonUnchecked(url, options) {
		return this.requestJson("get", {
			url,
			httpOptions: options
		});
	}
	getJson(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return this.requestJson("get", args);
	}
	getJsonSafe(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return Result.wrap(this.requestJson("get", args)).transform((response) => Result.ok(response.body));
	}
	/**
	* @deprecated use `head` instead
	*/
	headJson(url, httpOptions) {
		return this.requestJson("head", {
			url,
			httpOptions
		});
	}
	postJson(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return this.requestJson("post", args);
	}
	putJson(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return this.requestJson("put", args);
	}
	patchJson(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return this.requestJson("patch", args);
	}
	deleteJson(arg1, arg2, arg3) {
		const args = this.resolveArgs(arg1, arg2, arg3);
		return this.requestJson("delete", args);
	}
	stream(url, options) {
		const resolvedUrl = this.resolveUrl(url, options);
		const { options: combinedOptions } = this.prepareOptions(resolvedUrl, {
			...options,
			method: "get"
		});
		return stream(resolvedUrl.toString(), this._normalizeOptions(combinedOptions));
	}
	async getToml(arg1, arg2, arg3) {
		const { url, schema, httpOptions } = this.resolveArgs(arg1, arg2, arg3);
		const opts = {
			...httpOptions,
			method: "get",
			headers: {
				"Content-Type": "application/toml",
				...httpOptions?.headers
			}
		};
		const res = await this.getText(url, opts);
		if (schema) res.body = await Toml.pipe(schema).parseAsync(res.body);
		else res.body = await Toml.parseAsync(res.body);
		return res;
	}
};
//#endregion
export { HttpBase, applyDefaultHeaders };

//# sourceMappingURL=http.js.map