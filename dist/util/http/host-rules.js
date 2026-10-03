import { GlobalConfig } from "../../config/global.js";
import { matchRegexOrGlobList } from "../string-match.js";
import { logger } from "../../logger/index.js";
import { PLATFORM_FAMILIES } from "../../constants/platforms.js";
import { parseUrl } from "../url.js";
import { find } from "../host-rules.js";
import { hasProxy } from "../../proxy.js";
import { keepAliveAgents } from "./keep-alive.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/util/http/host-rules.ts
function findMatchingRule(url, options) {
	const { hostType, readOnly } = options;
	let res = find({
		hostType,
		url,
		readOnly
	});
	if (isNonEmptyString(res.token) || isNonEmptyString(res.username) || isNonEmptyString(res.password)) return res;
	if (hostType && PLATFORM_FAMILIES.github.apiUsingHostTypes.includes(hostType) && hostType !== "github") res = {
		...find({
			hostType: "github",
			url
		}),
		...res
	};
	const platform = GlobalConfig.get("platform");
	const platformEndpoint = GlobalConfig.get("endpoint");
	if (url.startsWith("https://api.github.com/")) res = {
		...find({
			hostType: "github",
			url
		}),
		...res
	};
	else if (platform === "github" && platformEndpoint) {
		const requestHost = parseUrl(url)?.hostname;
		const endpointHost = parseUrl(platformEndpoint)?.hostname;
		if (requestHost && endpointHost && requestHost === endpointHost) res = {
			...find({
				hostType: "github",
				url
			}),
			...res
		};
	}
	if (hostType && PLATFORM_FAMILIES.gitlab.apiUsingHostTypes.includes(hostType) && hostType !== "gitlab") res = {
		...find({
			hostType: "gitlab",
			url
		}),
		...res
	};
	if (hostType && PLATFORM_FAMILIES.bitbucket.apiUsingHostTypes.includes(hostType) && hostType !== "bitbucket") res = {
		...find({
			hostType: "bitbucket",
			url
		}),
		...res
	};
	if (hostType && PLATFORM_FAMILIES["bitbucket-server"].apiUsingHostTypes.includes(hostType) && hostType !== "bitbucket-server") res = {
		...find({
			hostType: "bitbucket-server",
			url
		}),
		...res
	};
	if (hostType && PLATFORM_FAMILIES.forgejo.apiUsingHostTypes.includes(hostType) && hostType !== "forgejo") res = {
		...find({
			hostType: "forgejo",
			url
		}),
		...res
	};
	if (hostType && PLATFORM_FAMILIES.gitea.apiUsingHostTypes.includes(hostType) && hostType !== "gitea") res = {
		...find({
			hostType: "gitea",
			url
		}),
		...res
	};
	return res;
}
function applyHostRule(url, options, hostRule) {
	if (hostRule.enabled === false) {
		options.enabled = false;
		return options;
	}
	const { username, password, token, authType } = hostRule;
	const host = parseUrl(url)?.host;
	if (options.noAuth) logger.trace({ url }, `Authorization disabled`);
	else if (isNonEmptyString(options.headers?.authorization) || isNonEmptyString(options.password) || isNonEmptyString(options.token)) {
		logger.once.debug(`hostRules: authentication already set for ${host}`);
		logger.trace({ url }, `Authorization already set`);
	} else if (password !== void 0) {
		logger.once.debug(`hostRules: applying Basic authentication for ${host}`);
		logger.trace({ url }, `Applying Basic authentication`);
		options.username = username;
		options.password = password;
	} else if (token) {
		logger.once.debug(`hostRules: applying Bearer authentication for ${host}`);
		logger.trace({ url }, `Applying Bearer authentication`);
		options.token = token;
		options.context = {
			...options.context,
			authType
		};
	} else logger.once.debug(`hostRules: no authentication for ${host}`);
	if (hostRule.abortOnError) options.abortOnError = hostRule.abortOnError;
	if (hostRule.abortIgnoreStatusCodes) options.abortIgnoreStatusCodes = hostRule.abortIgnoreStatusCodes;
	if (hostRule.timeout) options.timeout = hostRule.timeout;
	if (hostRule.headers) {
		const allowedHeaders = GlobalConfig.get("allowedHeaders");
		const filteredHeaders = {};
		for (const [header, value] of Object.entries(hostRule.headers)) if (matchRegexOrGlobList(header, allowedHeaders)) filteredHeaders[header] = value;
		else logger.once.error({
			allowedHeaders,
			header
		}, "Disallowed hostRules headers");
		options.headers = {
			...options.headers,
			...filteredHeaders
		};
	}
	if (hostRule.keepAlive) options.agent = keepAliveAgents;
	if (!hasProxy() && hostRule.enableHttp2 === true) options.http2 = true;
	if (isNonEmptyString(hostRule.httpsCertificateAuthority)) options.https = {
		...options.https,
		certificateAuthority: hostRule.httpsCertificateAuthority
	};
	if (isNonEmptyString(hostRule.httpsPrivateKey)) options.https = {
		...options.https,
		key: hostRule.httpsPrivateKey
	};
	if (isNonEmptyString(hostRule.httpsCertificate)) options.https = {
		...options.https,
		certificate: hostRule.httpsCertificate
	};
	return options;
}
//#endregion
export { applyHostRule, findMatchingRule };

//# sourceMappingURL=host-rules.js.map