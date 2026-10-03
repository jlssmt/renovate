import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import { parseLinkHeader } from "../url.js";
import { Json } from "../schema-utils/index.js";
import { HttpBase } from "./http.js";
import { isNonEmptyObject, isNullOrUndefined, isString } from "@sindresorhus/is";
import { RequestError } from "got";
import { DateTime } from "luxon";
import { z } from "zod/v4";
//#region lib/util/http/bitbucket.ts
const MAX_PAGES = 100;
const MAX_PAGELEN = 100;
let baseUrl = "https://api.bitbucket.org/";
function setBaseUrl(url) {
	baseUrl = url;
}
var BitbucketHttp = class extends HttpBase {
	get baseUrl() {
		return baseUrl;
	}
	constructor(type = "bitbucket", options) {
		super(type, options);
	}
	extraOptions() {
		return super.extraOptions().concat(["paginate", "pagelen"]);
	}
	handleError(url, httpOptions, err) {
		if (err instanceof RequestError && err.response) {
			const announcement = DeprecationAnnouncementBody.safeParse(err.response.body);
			if (announcement.success) {
				const { message, detail, data } = announcement.data.error;
				logger.once.warn({
					url: err.response.url,
					message,
					...detail && { detail },
					announcementUrl: data.announcement_url
				}, "Bitbucket API functionality has been deprecated or removed");
			}
		}
		return super.handleError(url, httpOptions, err);
	}
	handleResponse(url, res) {
		const { deprecation, sunset, link } = res.headers;
		if (!isString(deprecation) && !isString(sunset)) return;
		const announcementUrl = parseLinkHeader(isString(link) ? link : void 0)?.deprecation?.url;
		logger.once.warn({
			url: url.toString(),
			...isString(deprecation) && { deprecation: formatDate(deprecation) },
			...isString(sunset) && { sunset: formatDate(sunset) },
			...announcementUrl && { announcementUrl }
		}, "Bitbucket API endpoint has been marked as deprecated");
	}
	async requestJsonUnsafe(method, options) {
		const resolvedUrl = this.resolveUrl(options.url, options.httpOptions);
		const opts = {
			...options,
			url: resolvedUrl
		};
		const paginate = opts.httpOptions?.paginate;
		if (paginate && !hasPagelen(resolvedUrl)) {
			const pagelen = opts.httpOptions.pagelen ?? MAX_PAGELEN;
			resolvedUrl.searchParams.set("pagelen", pagelen.toString());
		}
		const result = await super.requestJsonUnsafe(method, opts);
		if (paginate && isPagedResult(result.body)) {
			// v8 ignore else -- TODO: add test #40625
			if (opts.httpOptions) opts.httpOptions.memCache = false;
			const resultBody = result.body;
			let nextURL = result.body.next;
			let page = 1;
			for (; nextURL && page <= MAX_PAGES; page++) {
				opts.url = nextURL;
				const nextResult = await super.requestJsonUnsafe(method, opts);
				resultBody.values.push(...nextResult.body.values);
				nextURL = nextResult.body.next;
			}
			resultBody.pagelen = resultBody.values.length;
			/* v8 ignore next -- hard to test all branches */
			resultBody.size = page <= MAX_PAGES ? resultBody.values.length : void 0;
			// v8 ignore next -- hard to test all branches
			resultBody.next = page <= MAX_PAGES ? nextURL : void 0;
		}
		return result;
	}
};
/**
* Bitbucket Cloud responds with an error body linking to the relevant changelog entry when the endpoint's functionality has been deprecated or removed.
*
* See https://developer.atlassian.com/cloud/bitbucket/changelog/
*/
const DeprecationAnnouncement = z.object({ error: z.object({
	message: z.string(),
	detail: z.string().optional(),
	data: z.object({ announcement_url: z.string() })
}) });
/** The body is already parsed for JSON requests, but a raw string otherwise. */
const DeprecationAnnouncementBody = z.union([DeprecationAnnouncement, Json.pipe(DeprecationAnnouncement)]);
/**
* Format a `Deprecation` or `Sunset` header as ISO 8601, falling back to the raw value when it cannot be parsed.
*
* `Sunset` is an HTTP date, and `Deprecation` is either an HTTP date or an `@`-prefixed Unix timestamp.
*/
function formatDate(value) {
	const seconds = regEx(/^@(?<seconds>\d+)$/).exec(value)?.groups?.seconds;
	if (seconds) return DateTime.fromSeconds(parseInt(seconds, 10), { zone: "utc" }).toISO() ?? value;
	const httpDate = value.replace(regEx(/ UTC$/), " GMT");
	return DateTime.fromHTTP(httpDate, { zone: "utc" }).toISO() ?? value;
}
function hasPagelen(url) {
	return !isNullOrUndefined(url.searchParams.get("pagelen"));
}
function isPagedResult(obj) {
	return isNonEmptyObject(obj) && Array.isArray(obj.values);
}
//#endregion
export { BitbucketHttp, setBaseUrl };

//# sourceMappingURL=bitbucket.js.map