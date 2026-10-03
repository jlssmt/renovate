import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import { PLATFORM_HOST_TYPES } from "../../constants/platforms.js";
import { createURLFromHostOrURL, isHttpUrl } from "../url.js";
import { find, getAll } from "../host-rules.js";
import { detectPlatform } from "../common.js";
import { parseGitUrl } from "./url.js";
import { addGitConfigEnvironmentVariables } from "./config.js";
import { isEmptyString } from "@sindresorhus/is";
//#region lib/util/git/auth.ts
const githubApiUrls = /* @__PURE__ */ new Set([
	"github.com",
	"api.github.com",
	"https://api.github.com",
	"https://api.github.com/"
]);
/**
* Append Git authentication configuration to a resolved child environment.
* @returns a new environment without modifying the input
*/
function getGitAuthenticatedEnvironmentVariables(environmentVariables, originalGitUrl, { token, username, password, hostType, matchHost }) {
	if (!token && !(username && password)) {
		logger.warn({ host: matchHost }, `Could not create environment variable for host as neither token or username and password was set`);
		return { ...environmentVariables };
	}
	let authenticationRules;
	if (token) authenticationRules = getAuthenticationRulesWithToken(originalGitUrl, hostType, token);
	else authenticationRules = getAuthenticationRules(originalGitUrl, hostType, `${encodeURIComponent(username)}:${encodeURIComponent(password)}`);
	return addGitConfigEnvironmentVariables(environmentVariables, authenticationRules.map((rule) => ({
		key: `url.${rule.url}.insteadOf`,
		value: rule.insteadOf
	})));
}
function getAuthenticationRulesWithToken(url, hostType, authToken) {
	let token = authToken;
	let type = hostType;
	type ??= detectPlatform(url);
	if (type === "gitlab") token = `gitlab-ci-token:${authToken}`;
	return getAuthenticationRules(url, type, token);
}
/**
* Generates the authentication rules for later git usage for the given host
* @link https://coolaj86.com/articles/vanilla-devops-git-credentials-cheatsheet/
* @param gitUrl Git repository URL
* @param hostType Git host type
* @param token Authentication token or `username:password` string
*/
function getAuthenticationRules(gitUrl, hostType, token) {
	const authenticationRules = [];
	const hasUser = token.split(":").length > 1;
	const insteadUrl = parseGitUrl(gitUrl);
	let sshPort = insteadUrl.port;
	if (hostType === "bitbucket-server") {
		insteadUrl.source = "bitbucket-server";
		// v8 ignore next -- TODO: add test #40625
		if (!sshPort || isEmptyString(sshPort)) sshPort = "7999";
	}
	const url = { ...insteadUrl };
	const protocol = regEx(/^https?$/).test(url.protocol) ? url.protocol : "https";
	url.token = hasUser ? token : `ssh:${token}`;
	authenticationRules.push({
		url: url.toString(protocol),
		insteadOf: `ssh://git@${insteadUrl.resource}${sshPort ? `:${sshPort}` : ""}/${insteadUrl.full_name}${insteadUrl.git_suffix ? ".git" : ""}`
	});
	url.token = hasUser ? token : `git:${token}`;
	authenticationRules.push({
		url: url.toString(protocol),
		insteadOf: {
			...insteadUrl,
			port: sshPort
		}.toString("ssh")
	});
	url.token = token;
	authenticationRules.push({
		url: url.toString(protocol),
		insteadOf: insteadUrl.toString(protocol)
	});
	return authenticationRules;
}
function getGitEnvironmentVariables(environmentVariables, hostTypes = []) {
	let gitEnvironmentVariables = { ...environmentVariables };
	const gitHubHostRule = find({
		hostType: "github",
		url: "https://api.github.com/"
	});
	if (gitHubHostRule?.token) gitEnvironmentVariables = getGitAuthenticatedEnvironmentVariables(gitEnvironmentVariables, "https://github.com/", gitHubHostRule);
	const gitAllowedHostTypes = /* @__PURE__ */ new Set([...PLATFORM_HOST_TYPES, ...hostTypes]);
	const hostRules = getAll().filter((r) => r.matchHost && (r.token ?? (r.username && r.password))).filter((r) => !gitHubHostRule || !githubApiUrls.has(r.matchHost));
	for (const hostRule of hostRules) if (!hostRule.hostType || gitAllowedHostTypes.has(hostRule.hostType)) gitEnvironmentVariables = addAuthFromHostRule(hostRule, gitEnvironmentVariables);
	return gitEnvironmentVariables;
}
function addAuthFromHostRule(hostRule, environmentVariables) {
	const httpUrl = createURLFromHostOrURL(hostRule.matchHost)?.toString();
	if (isHttpUrl(httpUrl)) {
		logger.trace(`Adding Git authentication for ${httpUrl} using token auth.`);
		return getGitAuthenticatedEnvironmentVariables(environmentVariables, httpUrl, hostRule);
	}
	logger.debug(`Could not parse registryUrl ${hostRule.matchHost} or not using http(s). Ignoring`);
	return { ...environmentVariables };
}
//#endregion
export { getAuthenticationRules, getGitAuthenticatedEnvironmentVariables, getGitEnvironmentVariables };

//# sourceMappingURL=auth.js.map