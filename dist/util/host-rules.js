import { GlobalConfig } from "../config/global.js";
import { matchRegexOrGlobList } from "./string-match.js";
import { toBase64 } from "./string.js";
import { addSecretForSanitizing, clearRepoSanitizedSecretsList } from "./sanitize.js";
import { logger } from "../logger/index.js";
import { clone } from "./clone.js";
import { isHttpUrl, massageHostUrl, parseUrl, stripUrlCredentials } from "./url.js";
import { isFalsy, isNonEmptyString, isString, isTruthy, isUndefined } from "@sindresorhus/is";
//#region lib/util/host-rules.ts
let hostRules = [];
/**
* Fields within `HostRule`s that must have their value registered for sanitising through `sanitize.addSecretForSanitizing()`.
*
* Kept in sync with `redactedFields` through tests.
*/
const confidentialFields = [
	"password",
	"token",
	"httpsPrivateKey",
	"httpsCertificate",
	"httpsCertificateAuthority"
];
function migrateRule(rule) {
	const cloned = clone(rule);
	delete cloned.hostName;
	delete cloned.domainName;
	delete cloned.baseUrl;
	const result = cloned;
	const { matchHost } = result;
	const { hostName, domainName, baseUrl } = rule;
	const hostValues = [
		matchHost,
		hostName,
		domainName,
		baseUrl
	].filter(isTruthy);
	if (hostValues.length === 1) {
		const [matchHost] = hostValues;
		result.matchHost = matchHost;
	} else if (hostValues.length > 1) throw new Error(`hostRules cannot contain more than one host-matching field - use "matchHost" only.`);
	return result;
}
/**
* Enforce the `allowedHeaders` allowlist on a set of host rules.
*
* Loudly remove anything that's not permitted, logging a WARN.
*
* `add()` applies this to every rule it registers, so callers only need it themselves to pre-filter - e.g. to avoid repeating the WARN when the same rules are registered again and again.
*
* @param [allowedHeaders] the effective allowlist. Defaults to `GlobalConfig`, but must be passed explicitly when filtering before `GlobalConfig` reflects the repository being processed, i.e. for a `repositories[]` entry's own `allowedHeaders` override
* @param [warnOnDenied=true] whether to log the WARN. Pass `false` where the very same rules are filtered again, so that it is logged once rather than repeated
*
* Headers that survive this allowlist are still subject to how {@link find} combines them: an admin's headers for a host are applied over those of any repository or preset rule matching the same request, so a repository can neither drop nor substitute them.
*/
function filterAllowedHeaders(rules, allowedHeaders, warnOnDenied = true) {
	const allowlist = allowedHeaders ?? GlobalConfig.get("allowedHeaders");
	const denied = [];
	const result = rules.map((rule) => {
		if (!rule.headers) return rule;
		const allowed = {};
		const ruleDenied = [];
		for (const [name, value] of Object.entries(rule.headers)) if (matchRegexOrGlobList(name, allowlist)) allowed[name] = value;
		else ruleDenied.push(name);
		if (!ruleDenied.length) return rule;
		denied.push(...ruleDenied);
		const filtered = {
			...rule,
			headers: allowed
		};
		if (!Object.keys(allowed).length) delete filtered.headers;
		return filtered;
	});
	if (denied.length && warnOnDenied) logger.warn({ denied }, "Ignoring hostRules headers not permitted by this Renovate instance's `allowedHeaders`");
	return result;
}
/**
* The trust tier a caller asked for.
*
* Deliberately opt-in: a caller that says nothing registers into the untrusted tier, so a new call site cannot grant itself the administrator's precedence by omission.
*/
function trustTierFor(options) {
	if (options?.trusted) return "admin";
	if (options?.inherited) return "inherit";
	return "untrusted";
}
function add(params, options) {
	let rule = {
		...migrateRule(params),
		trustTier: trustTierFor(options)
	};
	delete rule.trusted;
	if (!isUndefined(rule.allowInternal) && rule.trustTier === "untrusted") {
		logger.debug(`Ignoring hostRules allowInternal for ${rule.matchHost ?? rule.hostType} from untrusted config`);
		delete rule.allowInternal;
	}
	if (rule.headers) [rule] = filterAllowedHeaders([rule], options?.allowedHeaders);
	if (rule.matchHost) {
		rule.matchHost = massageHostUrl(rule.matchHost);
		const parsedUrl = parseUrl(rule.matchHost);
		rule.resolvedHost = parsedUrl?.hostname ?? rule.matchHost;
		confidentialFields.forEach((field) => {
			if (rule[field]) logger.debug(`Adding ${field} authentication for ${rule.matchHost} (hostType=${rule.hostType}) to hostRules`);
		});
	}
	confidentialFields.forEach((field) => {
		const secret = rule[field];
		if (isString(secret) && secret.length > 3) addSecretForSanitizing(secret);
	});
	if (rule.username && rule.password) addSecretForSanitizing(toBase64(`${rule.username}:${rule.password}`));
	hostRules.push(rule);
}
function matchesHost(url, matchHost) {
	const parsedUrl = parseUrl(url);
	if (!parsedUrl) return false;
	const parsedMatchHost = parseUrl(matchHost);
	if (isHttpUrl(parsedUrl) && isHttpUrl(parsedMatchHost)) return stripUrlCredentials(parsedUrl).startsWith(parsedMatchHost.href);
	const { hostname } = parsedUrl;
	if (!hostname) return false;
	if (hostname === matchHost) return true;
	const topLevelSuffix = matchHost.startsWith(".") ? matchHost : `.${matchHost}`;
	return hostname.endsWith(topLevelSuffix);
}
function fromShorterToLongerMatchHost(a, b) {
	if (!a.matchHost || !b.matchHost) return 0;
	return a.matchHost.length - b.matchHost.length;
}
function hostRuleRank({ hostType, matchHost, readOnly }) {
	if ((hostType || readOnly) && matchHost) return 3;
	if (matchHost) return 2;
	if (hostType) return 1;
	return 0;
}
function fromLowerToHigherRank(a, b) {
	return hostRuleRank(a) - hostRuleRank(b);
}
function fromLowerRankAndShorterMatchHost(a, b) {
	return fromLowerToHigherRank(a, b) || fromShorterToLongerMatchHost(a, b);
}
/**
* The `headers` that apply from a set of matching rules of the same trust tier.
*
* The last rule to set any wins outright, as `find()`'s callers receive them sorted from least to most specific. That is the behaviour every matching rule had before `headers` were combined across tiers, and it is what lets a broad rule's headers be masked by a narrower rule from the same source.
*/
function headersOfLastRuleToSetThem(rules) {
	return rules.map((rule) => rule.headers).filter(isTruthy).pop();
}
/**
* The last defined value, following the same "most specific rule wins" ordering as {@link headersOfLastRuleToSetThem}.
*/
function lastDefined(values) {
	return values.filter((value) => !isUndefined(value)).pop();
}
/**
* The rules whose grant is deliberately scoped, by a `hostType` or by a URL-prefix `matchHost` - see {@link InternalHostGrant}.
*/
function scopedRules(rules) {
	return rules.filter((rule) => isNonEmptyString(rule.hostType) || isHttpUrl(rule.matchHost));
}
function find(search) {
	if ([search.hostType, search.url].every(isFalsy)) {
		logger.warn({ search }, "Invalid hostRules search");
		return {};
	}
	const sortedRules = hostRules.sort(fromLowerRankAndShorterMatchHost);
	const matchedRules = [];
	for (const rule of sortedRules) {
		let hostTypeMatch = true;
		let hostMatch = true;
		let readOnlyMatch = true;
		if (rule.hostType) {
			hostTypeMatch = false;
			// v8 ignore else -- TODO: add test #40625
			if (search.hostType === rule.hostType) hostTypeMatch = true;
		}
		if (rule.matchHost && rule.resolvedHost) {
			hostMatch = false;
			if (search.url) hostMatch = matchesHost(search.url, rule.matchHost);
		}
		if (!isUndefined(rule.readOnly)) {
			readOnlyMatch = false;
			// v8 ignore else -- TODO: add test #40625
			if (search.readOnly === rule.readOnly) {
				readOnlyMatch = true;
				hostTypeMatch = true;
			}
		}
		if (hostTypeMatch && readOnlyMatch && hostMatch) matchedRules.push(clone(rule));
	}
	const res = Object.assign({}, ...matchedRules);
	const trustedRules = matchedRules.filter((rule) => rule.trustTier === "admin");
	const inheritedRules = matchedRules.filter((rule) => rule.trustTier === "inherit");
	const untrustedRules = matchedRules.filter((rule) => rule.trustTier === "untrusted");
	const untrustedHeaders = headersOfLastRuleToSetThem(untrustedRules);
	const inheritedHeaders = headersOfLastRuleToSetThem(inheritedRules);
	const trustedHeaders = headersOfLastRuleToSetThem(trustedRules);
	if (untrustedHeaders ?? inheritedHeaders ?? trustedHeaders) res.headers = {
		...untrustedHeaders,
		...inheritedHeaders,
		...trustedHeaders
	};
	const enabled = lastDefined(trustedRules.map((rule) => rule.enabled)) ?? lastDefined(inheritedRules.map((rule) => rule.enabled)) ?? lastDefined(untrustedRules.map((rule) => rule.enabled));
	if (!isUndefined(enabled)) res.enabled = enabled;
	const trustedExplicit = lastDefined(trustedRules.map((rule) => rule.allowInternal));
	const trustedScoped = lastDefined(scopedRules(trustedRules).map((rule) => rule.allowInternal));
	const adminVeto = trustedExplicit === false || trustedScoped === false;
	const inheritedExplicit = adminVeto ? false : lastDefined(inheritedRules.map((rule) => rule.allowInternal));
	const inheritedScoped = adminVeto ? false : lastDefined(scopedRules(inheritedRules).map((rule) => rule.allowInternal));
	const internalHostGrant = {
		explicit: trustedExplicit ?? inheritedExplicit,
		scoped: trustedScoped ?? inheritedScoped,
		implicit: !adminVeto && [...trustedRules, ...inheritedRules].some((rule) => isNonEmptyString(rule.matchHost))
	};
	if (!isUndefined(internalHostGrant.explicit) || !isUndefined(internalHostGrant.scoped) || internalHostGrant.implicit) res.internalHostGrant = internalHostGrant;
	delete res.hostType;
	delete res.resolvedHost;
	delete res.matchHost;
	delete res.readOnly;
	delete res.trustTier;
	delete res.trusted;
	delete res.allowInternal;
	return res;
}
function hosts({ hostType }) {
	return hostRules.filter((rule) => rule.hostType === hostType).map((rule) => rule.resolvedHost).filter(isTruthy);
}
function hostType({ url }) {
	return hostRules.filter((rule) => rule.matchHost && matchesHost(url, rule.matchHost)).sort(fromShorterToLongerMatchHost).map((rule) => rule.hostType).filter(isTruthy).pop() ?? null;
}
function findAll({ hostType }) {
	return hostRules.filter((rule) => rule.hostType === hostType);
}
/**
* @returns a deep copy of all known host rules without any filtering
*/
function getAll() {
	return clone(hostRules);
}
function clear() {
	logger.debug("Clearing hostRules");
	hostRules = [];
	clearRepoSanitizedSecretsList();
}
//#endregion
export { add, clear, confidentialFields, filterAllowedHeaders, find, findAll, getAll, hostType, hosts, matchesHost, migrateRule };

//# sourceMappingURL=host-rules.js.map