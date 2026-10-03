import { HOST_BLOCKED } from "../../constants/error-messages.js";
import { coerceObject } from "../object.js";
import { regEx } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { parseUrl } from "../url.js";
import { find } from "../host-rules.js";
import { hasProxy } from "../../proxy.js";
import { isString } from "@sindresorhus/is";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import net from "node:net";
//#region lib/util/http/host-guard.ts
/**
* Instance-metadata hostnames, blocked regardless of what they resolve to.
*
* Only names which serve nothing but metadata belong here: a name in this set can never be permitted, whatever the configuration says. Providers whose metadata service is only reachable by IP (AWS, Azure, ...) are covered by {@link metadataBlockList} instead.
*/
const metadataHostnames = /* @__PURE__ */ new Set(["metadata.google.internal", "metadata.packet.net"]);
const metadataBlockList = new net.BlockList();
metadataBlockList.addAddress("169.254.169.254", "ipv4");
metadataBlockList.addAddress("fd00:ec2::254", "ipv6");
metadataBlockList.addAddress("169.254.170.2", "ipv4");
metadataBlockList.addAddress("169.254.170.23", "ipv4");
metadataBlockList.addAddress("100.100.100.200", "ipv4");
const internalBlockList = new net.BlockList();
internalBlockList.addSubnet("0.0.0.0", 8, "ipv4");
internalBlockList.addSubnet("10.0.0.0", 8, "ipv4");
internalBlockList.addSubnet("172.16.0.0", 12, "ipv4");
internalBlockList.addSubnet("192.168.0.0", 16, "ipv4");
internalBlockList.addSubnet("100.64.0.0", 10, "ipv4");
internalBlockList.addSubnet("127.0.0.0", 8, "ipv4");
internalBlockList.addSubnet("169.254.0.0", 16, "ipv4");
internalBlockList.addSubnet("224.0.0.0", 4, "ipv4");
internalBlockList.addAddress("::", "ipv6");
internalBlockList.addAddress("::1", "ipv6");
internalBlockList.addSubnet("fc00::", 7, "ipv6");
internalBlockList.addSubnet("fe80::", 10, "ipv6");
/**
* Classifies an IP address, returning the category it is blocked under, or `null` for a public address.
*
* A string that is not a valid IP address is classified as `internal` - we should fail closed instead of possibly connecting to something we shouldn't be.
*/
function classifyIpAddress(address) {
	const version = net.isIP(address);
	if (version === 0) return "internal";
	const family = version === 4 ? "ipv4" : "ipv6";
	if (metadataBlockList.check(address, family)) return "metadata";
	if (internalBlockList.check(address, family)) return "internal";
	return null;
}
/**
* Classifies a hostname against the metadata-endpoint hostname list.
*
* Only metadata hostnames can be classified without DNS resolution - any other hostname needs its resolved addresses checked via {@link classifyIpAddress}.
*/
function classifyHostname(hostname) {
	const normalized = hostname.toLowerCase().replace(regEx(/\.$/), "");
	if (metadataHostnames.has(normalized)) return "metadata";
	return null;
}
/** Strips the brackets `URL` keeps around IPv6 hosts, leaving other hosts as they are. */
function unbracketHostname(hostname) {
	if (hostname.startsWith("[") && hostname.endsWith("]")) return hostname.slice(1, -1);
	return hostname;
}
/**
* Classifies a URL from its host alone: IP-literal hosts are classified by address, and metadata hostnames by name.
*
* Returns `null` when nothing can be decided at the URL level - i.e. the host is a regular hostname, whose resolved addresses must be checked via {@link classifyIpAddress} at DNS lookup time.
*/
function classifyUrl(url) {
	const hostname = unbracketHostname(url.hostname);
	if (net.isIP(hostname) !== 0) return classifyIpAddress(hostname);
	return classifyHostname(hostname);
}
/**
* Returns the resolved address which decides the outcome for a hostname, or `null` when every one of them is a public address.
*
* Each resolved record is a potential connection target, so each must pass. A metadata address decides the outcome over an internal one, as it is blocked in every mode.
*/
function findBlockedAddress(addresses) {
	let internal = null;
	for (const address of addresses) {
		const category = classifyIpAddress(address);
		if (category === "metadata") return {
			address,
			category
		};
		if (category === "internal") internal ??= {
			address,
			category
		};
	}
	return internal;
}
/**
* Applies `decision` to the addresses a hostname resolved to, logging the outcome, and returning `true` when the request must not be made.
*/
function isResolutionBlocked(hostname, addresses, decision, hostType, responseBecomesConfig) {
	const blocked = findBlockedAddress(addresses);
	if (!blocked) return false;
	if (blocked.category === "internal") {
		if (decision === "granted") return false;
		if (decision === "warn-dns") {
			warnInternalHost(hostname, hostType, responseBecomesConfig);
			return false;
		}
	}
	logger.warn({
		hostname,
		address: blocked.address
	}, "Blocked HTTP request: hostname resolves to a blocked address");
	return true;
}
/**
* Validates every address a hostname resolves to, on every connection, which also catches a host whose answer changes between checks (DNS rebinding).
*
* The guard is built per request, as the policy it enforces is read from the configuration when the request is made.
*/
function makeGuardedLookup(decision, hostType, responseBecomesConfig) {
	return function guardedLookup(hostname, options, callback) {
		dns.lookup(hostname, options, (err, address, family) => {
			if (err) {
				callback(err, address, family);
				return;
			}
			if (isResolutionBlocked(hostname, isString(address) ? [address] : address.map((entry) => entry.address), decision, hostType, responseBecomesConfig)) {
				callback(new Error(HOST_BLOCKED), address, family);
				return;
			}
			callback(err, address, family);
		});
	};
}
function isPlatformEndpoint(url) {
	const endpoint = GlobalConfig.get("endpoint");
	if (!endpoint) return false;
	return parseUrl(endpoint)?.origin === url.origin;
}
/**
* Whether the administrator has permitted internal access for this request, leaving aside the `internalHostAccess` mode: a permitted request neither blocks nor warns, whatever the mode is.
*/
function isInternalGranted(url, grant, responseBecomesConfig) {
	if (isPlatformEndpoint(url)) return true;
	if (responseBecomesConfig) return grant?.scoped === true;
	return grant?.explicit ?? grant?.implicit ?? false;
}
/**
* Warns about a request which `internalHostAccess=block` would refuse, once per host, naming the grant which would permit it.
*/
function warnInternalHost(hostname, hostType, responseBecomesConfig) {
	if (responseBecomesConfig) {
		logger.once.warn({
			hostname,
			hostType
		}, "HTTP request to an internal host whose response becomes configuration, which `internalHostAccess=block` would refuse - permit it with a `hostRules` entry setting `allowInternal: true`, scoped with a `hostType` or a URL-prefix `matchHost`, or set `internalHostAccess=block` to enforce this now. The default will become `block` in a future major release.");
		return;
	}
	logger.once.warn({
		hostname,
		hostType
	}, "HTTP request to an internal host, which `internalHostAccess=block` would refuse - permit it with a `hostRules` entry naming the host, or one setting `allowInternal: true`, or set `internalHostAccess=block` to enforce this now. The default will become `block` in a future major release.");
}
/**
* Enforce the internal-host policy on a request URL, throwing `HOST_BLOCKED` when the request must not be made.
*
* Metadata endpoints are blocked no matter what the configuration says: Renovate's HTTP layer never has a legitimate reason to request them.
*/
function checkUrl(url, hostType, grant, responseBecomesConfig) {
	const category = classifyUrl(url);
	if (category === "metadata") {
		logger.warn({
			url: url.href,
			hostType
		}, "Blocked HTTP request to a cloud instance-metadata endpoint");
		throw new Error(HOST_BLOCKED);
	}
	const mode = GlobalConfig.get("internalHostAccess");
	if (mode === "allow" || isInternalGranted(url, grant, responseBecomesConfig)) {
		if (category === "internal") logger.once.info(`Internal host ${url.hostname} permitted by configuration`);
		return "granted";
	}
	if (mode === "warn") {
		if (category === "internal") warnInternalHost(url.hostname, hostType, responseBecomesConfig);
		return "warn-dns";
	}
	if (category === "internal") {
		logger.warn({
			url: url.href,
			hostType
		}, "Blocked HTTP request to an internal host - a self-hosted administrator can permit it via `hostRules`, or with `internalHostAccess=allow`");
		throw new Error(HOST_BLOCKED);
	}
	return "check-dns";
}
/**
* Validates what a request's hostname resolves to, before the request is made, for deployments where `dnsLookup` cannot do it.
*
* A proxy agent connects to the proxy and hands it the target hostname, so the target is resolved by the proxy and Renovate's `dnsLookup` guard never runs. Resolving here instead is best-effort only: the proxy re-resolves the hostname itself, so a DNS-rebinding or split-horizon answer can still differ from what we saw. Pair it with egress controls on the proxy.
*/
async function preflightHostname(url, decision, hostType, responseBecomesConfig) {
	const hostname = unbracketHostname(url.hostname);
	if (net.isIP(hostname) !== 0) return;
	let addresses;
	try {
		addresses = await dnsPromises.lookup(hostname, { all: true });
	} catch {
		logger.once.debug(`Host guard could not resolve ${hostname} - relying on the proxy for this request`);
		return;
	}
	if (isResolutionBlocked(hostname, addresses.map((entry) => entry.address), decision, hostType, responseBecomesConfig)) throw new Error(HOST_BLOCKED);
}
function makeBeforeRequest(hostType, responseBecomesConfig) {
	return async function hostGuardBeforeRequest(options) {
		const url = options.url instanceof URL ? options.url : null;
		if (!url) throw new Error(HOST_BLOCKED);
		const grant = find({
			hostType,
			url: url.toString()
		}).internalHostGrant;
		await preflightHostname(url, checkUrl(url, hostType, grant, responseBecomesConfig), hostType, responseBecomesConfig);
	};
}
/**
* Removes the credentials belonging to the host a request is being redirected away from, so that a redirect cannot hand them to another origin.
*
* got strips the credentials it knows about itself - `authorization`, `cookie` and any URL userinfo - before this hook runs, and treats a scheme downgrade as a different origin, so an `https:` to `http:` redirect is covered. What it does not know about survives: the `Private-token` header GitLab personal access tokens are sent in (see `applyAuthorization`), and any credential an administrator configured through a `hostRules` `headers` entry.
*
* Those headers are dropped rather than replaced with the target host's own: `hostRules` headers are resolved once, when the request is built, so there is nothing to re-apply here. Sending none is the safe outcome.
*/
function stripCrossOriginCredentials(options, fromUrl, toUrl, hostType) {
	if (fromUrl?.origin === toUrl.origin) return;
	if (fromUrl) {
		const configured = find({
			hostType,
			url: fromUrl.toString()
		}).headers;
		for (const name of Object.keys(coerceObject(configured))) delete options.headers[name.toLowerCase()];
	}
	delete options.headers.authorization;
	delete options.headers.cookie;
	delete options.headers["private-token"];
}
function makeBeforeRedirect(hostType, responseBecomesConfig) {
	return function hostGuardBeforeRedirect(options, response) {
		const url = options.url instanceof URL ? options.url : null;
		if (!url) throw new Error(HOST_BLOCKED);
		stripCrossOriginCredentials(options, isString(response.url) ? parseUrl(response.url) : null, url, hostType);
		const grant = find({
			hostType,
			url: url.toString()
		}).internalHostGrant;
		options.dnsLookup = makeGuardedLookup(checkUrl(url, hostType, grant, responseBecomesConfig), hostType, responseBecomesConfig);
	};
}
/**
* Enforce the internal-host policy for a request to `url`, throwing `HOST_BLOCKED` when the request must not be made at all.
*
* The returned got options carry the policy through the rest of the request's lifetime: `dnsLookup` validates what hostnames resolve to (on every connection, which also covers DNS rebinding), and `beforeRedirect` re-runs this check for every redirect target.
*
* When a proxy is configured, the proxy agent resolves the target hostname itself and `dnsLookup` is never called, so a `beforeRequest` hook resolves and validates the hostname up front instead - see {@link preflightHostname} for what that can and cannot catch.
*
* `responseBecomesConfig` marks a request whose response is interpreted as Renovate configuration, which an internal host may only serve under a deliberately-scoped `allowInternal` grant.
*
* Under the `internalHostAccess=warn` default, an internal host which no grant permits is logged rather than blocked, so that administrators can add the grants they need before the default becomes `block`.
*/
function applyHostGuard(url, hostType, grant, responseBecomesConfig) {
	const guard = {
		dnsLookup: makeGuardedLookup(checkUrl(url, hostType, grant, responseBecomesConfig), hostType, responseBecomesConfig),
		beforeRedirect: makeBeforeRedirect(hostType, responseBecomesConfig)
	};
	if (hasProxy()) guard.beforeRequest = makeBeforeRequest(hostType, responseBecomesConfig);
	return guard;
}
//#endregion
export { applyHostGuard, checkUrl, classifyHostname, classifyIpAddress, classifyUrl };

//# sourceMappingURL=host-guard.js.map