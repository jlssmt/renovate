import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import { parseUrl } from "../url.js";
import { find } from "../host-rules.js";
import { detectPlatform } from "../common.js";
import gitUrlParse from "git-url-parse";
//#region lib/util/git/url.ts
function parseGitUrl(url) {
	return gitUrlParse(url);
}
function getHttpUrl(url, token) {
	const parsedUrl = parseGitUrl(url);
	let { protocol } = parsedUrl;
	const origProtocol = protocol;
	if (!regEx(/^https?$/).test(protocol)) {
		parsedUrl.port = "443";
		protocol = "https";
	}
	parsedUrl.user = "";
	parsedUrl.token = token ?? "";
	switch (detectPlatform(parsedUrl.toString(protocol))) {
		case "gitlab":
			if (token) parsedUrl.token = token.includes(":") ? token : `gitlab-ci-token:${token}`;
			break;
		case "github":
			if (token) parsedUrl.token = token.includes(":") ? token : `x-access-token:${token}`;
			break;
		case "bitbucket-server":
 // v8 ignore else -- TODO: add test #40625
		if (origProtocol === "ssh") parsedUrl.source = "bitbucket-server";
	}
	const httpUrl = parseUrl(parsedUrl.toString(protocol));
	// v8 ignore if: git-url-parse always produces a parseable URL string
	if (!httpUrl) throw new Error(`Failed to parse git URL: ${parsedUrl.toString(protocol)}`);
	return httpUrl.href;
}
function getRemoteUrlWithToken(url, hostType) {
	let coercedUrl;
	try {
		coercedUrl = getHttpUrl(url);
	} catch {
		logger.warn({ url }, `Attempting to use non-git url for git operations`);
		coercedUrl = url;
	}
	const hostRule = find({
		url: coercedUrl,
		hostType
	});
	if (hostRule?.token) {
		logger.debug(`Found hostRules token for url ${url}`);
		return getHttpUrl(url, encodeURIComponent(hostRule.token));
	}
	if (hostRule?.username && hostRule?.password) {
		logger.debug(`Found hostRules username and password for url ${url}`);
		return getHttpUrl(url, `${encodeURIComponent(hostRule.username)}:${encodeURIComponent(hostRule.password)}`);
	}
	return url;
}
//#endregion
export { getHttpUrl, getRemoteUrlWithToken, parseGitUrl };

//# sourceMappingURL=url.js.map