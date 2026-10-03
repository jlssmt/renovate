import { CONFIG_GIT_URL_UNAVAILABLE } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, parseUrl } from "../../../util/url.js";
import { getUrl } from "../../../util/git/index.js";
import { getPrBodyStruct } from "../pr-body.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/platform/bitbucket-server/utils.ts
const BITBUCKET_INVALID_REVIEWERS_EXCEPTION = "com.atlassian.bitbucket.pull.InvalidPullRequestReviewersException";
const prStateMapping = {
	MERGED: "merged",
	DECLINED: "closed",
	OPEN: "open"
};
function prInfo(pr) {
	return {
		version: pr.version,
		number: pr.id,
		bodyStruct: getPrBodyStruct(pr.description),
		sourceBranch: pr.fromRef.displayId,
		targetBranch: pr.toRef.displayId,
		title: pr.title,
		state: prStateMapping[pr.state],
		createdAt: pr.createdDate
	};
}
function isInvalidReviewersResponse(err) {
	const errors = coerceArray(err?.response?.body?.errors);
	return errors.length > 0 && errors.every((error) => error.exceptionName === "com.atlassian.bitbucket.pull.InvalidPullRequestReviewersException");
}
function getInvalidReviewers(err) {
	const errors = coerceArray(err?.response?.body?.errors);
	let invalidReviewers = [];
	for (const error of errors)
 // v8 ignore else -- TODO: add test #40625
	if (error.exceptionName === "com.atlassian.bitbucket.pull.InvalidPullRequestReviewersException") invalidReviewers = invalidReviewers.concat(coerceArray(error.reviewerErrors?.map(({ context }) => context).filter(isNonEmptyString)));
	return invalidReviewers;
}
function generateUrlFromEndpoint(defaultEndpoint, opts, repository) {
	const url = parseUrl(defaultEndpoint);
	if (!url) throw new Error(`Invalid Bitbucket Server endpoint: ${defaultEndpoint}`);
	const authString = opts.username && opts.password ? `${opts.username}:${opts.password}` : opts.username ?? "";
	const generatedUrl = getUrl({
		protocol: url.protocol,
		auth: authString,
		host: `${url.host}${ensureTrailingSlash(url.pathname)}scm`,
		repository
	});
	logger.debug(`Using generated endpoint URL: ${generatedUrl}`);
	return generatedUrl;
}
function injectAuth(url, opts) {
	const repoUrl = parseUrl(url);
	if (!repoUrl) {
		logger.debug(`Invalid url: ${url}`);
		throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
	}
	// v8 ignore else -- TODO: add test #40625
	if (!opts.token && opts.username && opts.password) {
		repoUrl.username = opts.username;
		repoUrl.password = opts.password;
	}
	return repoUrl.toString();
}
function getRepoGitUrl(repository, defaultEndpoint, gitUrl, info, opts) {
	switch (gitUrl) {
		case "endpoint": {
			const generatedUrl = generateUrlFromEndpoint(defaultEndpoint, opts, repository);
			logger.debug(`Using endpoint URL: ${generatedUrl}`);
			return generatedUrl;
		}
		case "ssh": {
			const sshUrl = info.links.clone?.find(({ name }) => name === "ssh");
			if (sshUrl === void 0) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
			logger.debug(`Using ssh URL: ${sshUrl.href}`);
			return sshUrl.href;
		}
		case void 0:
		case "default": {
			let cloneUrl = info.links.clone?.find(({ name }) => name === "http");
			if (cloneUrl) return injectAuth(cloneUrl.href, opts);
			cloneUrl = info.links.clone?.find(({ name }) => name === "ssh");
			if (cloneUrl) return cloneUrl.href;
			return generateUrlFromEndpoint(defaultEndpoint, opts, repository);
		}
	}
}
function getExtraCloneOpts(opts) {
	if (opts.token) return { "-c": `http.extraHeader=Authorization: Bearer ${opts.token}` };
	return {};
}
function splitEscapedSpaces(str) {
	const parts = str.split(" ");
	const result = [];
	let last;
	for (const part of parts) {
		if (last?.endsWith("\\\\")) result[result.length - 1] = `${last.slice(0, -2)} ${part}`;
		else result.push(part);
		last = result.at(-1);
	}
	return result;
}
function parseModifier(value) {
	const match = regEx("^random(?:\\((\\d+)\\))?$").exec(value);
	if (!match) return null;
	return parseInt(match[1] ?? "1", 10);
}
//#endregion
export { BITBUCKET_INVALID_REVIEWERS_EXCEPTION, getExtraCloneOpts, getInvalidReviewers, getRepoGitUrl, isInvalidReviewersResponse, parseModifier, prInfo, splitEscapedSpaces };

//# sourceMappingURL=utils.js.map