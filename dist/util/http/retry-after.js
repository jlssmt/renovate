import { logger } from "../../logger/index.js";
import { parseUrl } from "../url.js";
import { RequestError } from "got";
import { DateTime } from "luxon";
import { setTimeout } from "node:timers/promises";
//#region lib/util/http/retry-after.ts
const hostDelays = /* @__PURE__ */ new Map();
const maxRetries = 2;
/**
* Given a task that returns a promise, retry the task if it fails with a
* 429 Too Many Requests or 403 Forbidden response, using the Retry-After
* header to determine the delay.
*
* For response codes other than 429 or 403, or if the Retry-After header
* is not present or invalid, the task is not retried, throwing the error.
*/
async function wrapWithRetry(task, url, getRetryAfter, maxRetryAfter) {
	const key = parseUrl(url)?.host ?? url;
	let retries = 0;
	for (;;) try {
		await hostDelays.get(key);
		hostDelays.delete(key);
		return await task();
	} catch (err) {
		const delaySeconds = getRetryAfter(err);
		if (delaySeconds === null) throw err;
		if (retries === maxRetries) {
			logger.debug(`Retry-After: reached maximum retries (${maxRetries}) for ${url}`);
			throw err;
		}
		if (delaySeconds > maxRetryAfter) {
			logger.debug(`Retry-After: delay ${delaySeconds} seconds exceeds maxRetryAfter ${maxRetryAfter} seconds for ${url}`);
			throw err;
		}
		logger.debug(`Retry-After: will retry ${url} after ${delaySeconds} seconds`);
		let hostDelay = hostDelays.get(key);
		hostDelay ??= Promise.resolve();
		const delay = Promise.all([hostDelay, setTimeout(1e3 * delaySeconds)]);
		hostDelays.set(key, delay);
		retries += 1;
	}
}
function getRetryAfter(err) {
	if (!(err instanceof RequestError)) return null;
	if (!err.response) return null;
	if (err.response.statusCode < 400 || err.response.statusCode >= 500) {
		logger.debug({ url: err.response.url }, `Retry-After: unexpected status code ${err.response.statusCode}`);
		return null;
	}
	const retryAfter = err.response.headers["retry-after"]?.trim();
	if (!retryAfter) return null;
	const date = DateTime.fromHTTP(retryAfter);
	if (date.isValid) {
		const seconds = Math.floor(date.diffNow("seconds").seconds);
		if (seconds < 0) {
			logger.debug({
				url: err.response.url,
				retryAfter
			}, "Retry-After: date in the past");
			return null;
		}
		return seconds;
	}
	const seconds = parseInt(retryAfter, 10);
	if (!Number.isNaN(seconds) && seconds >= 0) return seconds;
	logger.debug({
		url: err.response.url,
		retryAfter
	}, "Retry-After: unsupported format");
	return null;
}
//#endregion
export { getRetryAfter, wrapWithRetry };

//# sourceMappingURL=retry-after.js.map