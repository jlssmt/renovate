import { coerceString } from "../string.js";
import { logger } from "../../logger/index.js";
import { HttpStats } from "../stats.js";
import { coerceNumber } from "../number.js";
import "./legacy.js";
import { GotExtraOptionKeys } from "./types.js";
import { isNumber } from "@sindresorhus/is";
import got, { RequestError, RequestError as RequestError$1 } from "got";
//#region lib/util/http/got.ts
function configureRejectUnauth(options) {
	if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
		logger.once.warn("NODE_TLS_REJECT_UNAUTHORIZED=0 found, this is strongly discouraged.");
		options.https = {
			...options.https,
			rejectUnauthorized: false
		};
	}
}
async function fetch(url, options, queueStats) {
	logger.trace({
		url,
		options
	}, "got request");
	configureRejectUnauth(options);
	let duration = 0;
	let statusCode = 0;
	try {
		const resp = await got(url, { ...options });
		statusCode = resp.statusCode;
		duration = coerceNumber(resp.timings.phases.total, 0);
		return resp;
	} catch (error) {
		// v8 ignore else -- TODO: add test #40625
		if (error instanceof RequestError) {
			statusCode = coerceNumber(error.response?.statusCode, -1);
			duration = coerceNumber(error.timings?.phases.total, -1);
			const method = options.method.toUpperCase();
			const code = coerceString(error.code, "UNKNOWN");
			const retryCount = coerceNumber(error.request?.retryCount, -1);
			logger.debug(`${method} ${url} = (code=${code}, statusCode=${statusCode} retryCount=${retryCount}, duration=${duration})`);
		}
		throw error;
	} finally {
		HttpStats.write({
			method: options.method,
			url,
			reqMs: duration,
			queueMs: queueStats.queueMs,
			status: statusCode
		});
	}
}
function stream(url, options) {
	configureRejectUnauth(options);
	return got.stream(url, options);
}
/**
* Removes non-got options and normalizes some options to match got's expected format.
* @param options options to normalize
* @returns normalized got options
*/
function normalize(options, keysToRemove) {
	const opts = { ...options };
	for (const key of [...GotExtraOptionKeys, ...keysToRemove]) delete opts[key];
	if (isNumber(opts.timeout)) opts.timeout = { request: opts.timeout };
	return opts;
}
//#endregion
export { RequestError$1 as RequestError, configureRejectUnauth, fetch, normalize, stream };

//# sourceMappingURL=got.js.map