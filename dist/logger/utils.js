import { regEx } from "../util/regex.js";
import { ExecError } from "../util/exec/exec-error.js";
import { redactedFields, sanitize } from "../util/sanitize.js";
import { isArray, isBuffer, isDate, isEmptyObject, isError, isFunction, isNonEmptyObject, isNonEmptyStringAndNotWhitespace, isObject, isPlainObject, isString } from "@sindresorhus/is";
import { RequestError } from "got";
import { DateTime } from "luxon";
import { ZodError } from "zod/v4";
//#region lib/logger/utils.ts
const contentFields = [
	"content",
	"contents",
	"packageLockParsed",
	"yarnLockParsed"
];
function prepareZodIssues(input) {
	if (!isPlainObject(input)) return null;
	let err = null;
	// v8 ignore else -- TODO: add test #40625
	if (isArray(input._errors, isString)) {
		if (input._errors.length === 1) err = input._errors[0];
		else if (input._errors.length > 1) err = input._errors;
		else err = null;
	}
	delete input._errors;
	if (isEmptyObject(input)) return err;
	const output = {};
	const entries = Object.entries(input);
	for (const [key, value] of entries.slice(0, 3)) {
		const child = prepareZodIssues(value);
		// v8 ignore else -- TODO: add test #40625
		if (child !== null) output[key] = child;
	}
	if (entries.length > 3) output.___ = `... ${entries.length - 3} more`;
	return output;
}
function prepareZodError(err) {
	Object.defineProperty(err, "message", {
		get: () => "Schema error",
		/* v8 ignore start -- TODO: drop set? */
		set: () => {}
	});
	return {
		message: err.message,
		stack: err.stack,
		issues: prepareZodIssues(err.format())
	};
}
function prepareError(err) {
	if (err instanceof ZodError) return prepareZodError(err);
	const response = { ...err };
	if (!response.message && err.message) response.message = err.message;
	if (!response.stack && err.stack) response.stack = err.stack;
	if (err instanceof AggregateError) response.errors = err.errors.map((error) => prepareError(error));
	if (err instanceof ExecError && isNonEmptyObject(err.options?.env)) {
		const env = Object.keys(err.options.env);
		response.options = {
			...err.options,
			env
		};
	}
	if (err instanceof RequestError) {
		const options = {
			headers: structuredClone({ ...err.options.headers }),
			url: err.options.url?.toString(),
			hostType: err.options.context.hostType
		};
		response.options = options;
		options.username = err.options.username;
		options.password = err.options.password;
		options.method = err.options.method;
		options.http2 = err.options.http2;
		// v8 ignore else -- TODO: add test #40625
		if (err.response) response.response = {
			statusCode: err.response.statusCode,
			statusMessage: err.response.statusMessage,
			body: err.name === "TimeoutError" ? void 0 : structuredClone(err.response.body),
			headers: structuredClone(err.response.headers),
			httpVersion: err.response.httpVersion,
			retryCount: err.response.retryCount
		};
	}
	return response;
}
function isNested(value) {
	return isArray(value) || isObject(value);
}
function sanitizeValue(value, seen = /* @__PURE__ */ new WeakMap()) {
	if (isString(value)) return sanitize(sanitizeUrls(value));
	if (value instanceof String) return sanitize(sanitizeUrls(value.toString()));
	if (isDate(value)) return value;
	if (DateTime.isDateTime(value)) return value.toISO();
	if (isFunction(value)) return "[function]";
	if (isBuffer(value)) return "[content]";
	if (isError(value)) return sanitizeValue(prepareError(value), seen);
	if (isArray(value)) {
		const length = value.length;
		const arrayResult = Array(length);
		seen.set(value, arrayResult);
		for (let idx = 0; idx < length; idx += 1) {
			const val = value[idx];
			arrayResult[idx] = isNested(val) && seen.has(val) ? seen.get(val) : sanitizeValue(val, seen);
		}
		return arrayResult;
	}
	if (isObject(value)) {
		const objectResult = {};
		seen.set(value, objectResult);
		for (const [key, val] of Object.entries(value)) {
			let curValue;
			if (!val) curValue = val;
			else if (redactedFields.includes(key)) {
				if (isString(val) && regEx(/^{{\s*secrets\..*}}$/).test(val)) curValue = val;
				else curValue = "***********";
			} else if (contentFields.includes(key)) curValue = "[content]";
			else if (key === "secrets") {
				curValue = {};
				Object.keys(val).forEach((secretKey) => {
					curValue[secretKey] = "***********";
				});
			} else curValue = seen.has(val) ? seen.get(val) : sanitizeValue(val, seen);
			const sanitizedKey = sanitizeValue(key, seen);
			objectResult[sanitizedKey] = curValue;
		}
		return objectResult;
	}
	return value;
}
const urlRe = regEx(/[a-z]{3,9}:\/\/[^@/]+@[a-z0-9.-]+/gi);
const urlCredRe = regEx(/\/\/[^@]+@/g);
const dataUriCredRe = regEx(/^(?<prefix>data:[0-9a-z-]+\/[0-9a-z-]+;).+/i);
function sanitizeUrls(text) {
	return text.replace(urlRe, (url) => {
		return url.replace(urlCredRe, "//**redacted**@");
	}).replace(dataUriCredRe, "$<prefix>**redacted**");
}
function getEnv(key) {
	return [process.env[`RENOVATE_${key}`], process.env[key]].map((v) => v?.toLowerCase().trim()).find(isNonEmptyStringAndNotWhitespace);
}
function getMessage(p1, p2) {
	return isString(p1) ? p1 : p2;
}
function toMeta(p1) {
	return isObject(p1) ? p1 : {};
}
//#endregion
export { prepareError as default, getEnv, getMessage, prepareZodError, prepareZodIssues, sanitizeUrls, sanitizeValue, toMeta };

//# sourceMappingURL=utils.js.map