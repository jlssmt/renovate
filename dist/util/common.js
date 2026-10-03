import { coerceObject } from "./object.js";
import { GlobalConfig } from "../config/global.js";
import { logger } from "../logger/index.js";
import { PLATFORM_FAMILIES } from "../constants/platforms.js";
import { parseUrl } from "./url.js";
import { InheritConfig, NOT_PRESENT } from "../config/inherit.js";
import { hostType } from "./host-rules.js";
import { isNumber } from "@sindresorhus/is";
import JSON5 from "json5";
import { parse } from "jsonc-weaver";
//#region lib/util/common.ts
/**
* Tries to detect the `platform` from a url.
*
* @param url the url to detect `platform` from
* @returns matched `platform` if found, otherwise `null`
*/
function detectPlatform(url) {
	const { hostname } = coerceObject(parseUrl(url));
	if (hostname) {
		if (hostname.endsWith(".visualstudio.com")) return "azure";
		for (const [family, { knownHosts }] of Object.entries(PLATFORM_FAMILIES)) if (knownHosts.includes(hostname)) return family;
		if (hostname.includes("bitbucket")) return "bitbucket-server";
		if (hostname.includes("forgejo")) return "forgejo";
		if (hostname.includes("gitea")) return "gitea";
		if (hostname.includes("github")) return "github";
		if (hostname.includes("gitlab")) return "gitlab";
	}
	const hostType$1 = hostType({ url });
	if (!hostType$1) return null;
	for (const [family, { apiUsingHostTypes }] of Object.entries(PLATFORM_FAMILIES)) if (apiUsingHostTypes.includes(hostType$1)) return family;
	return null;
}
function noLeadingAtSymbol(input) {
	return input.startsWith("@") ? input.slice(1) : input;
}
function parseJson(content, filename) {
	if (!content) return null;
	if (filename.endsWith(".jsonc")) return parseJsonc(content);
	if (filename.endsWith(".json5")) return JSON5.parse(content);
	return parseJsonWithFallback(content, filename);
}
function parseJsonWithFallback(content, context) {
	let parsedJson;
	try {
		parsedJson = parseJsonc(content);
	} catch {
		parsedJson = JSON5.parse(content);
		logger.warn({ context }, "File contents are invalid JSONC but parse using JSON5. Support for this will be removed in a future release so please change to a support .json5 file name or ensure correct JSON syntax.");
	}
	return parsedJson;
}
function parseJsonc(content) {
	return parse(content);
}
/**
* Use only if an option is inherited + globalOnly
* For globalOnly options use GlobalConfig.get
*/
function getInheritedOrGlobal(key) {
	const inheritedValue = InheritConfig.get(key);
	const globalValue = GlobalConfig.get(key);
	if (inheritedValue !== NOT_PRESENT) {
		if (key === "onboardingAutoCloseAge" && isNumber(inheritedValue) && isNumber(globalValue) && globalValue < inheritedValue) return globalValue;
		return inheritedValue;
	}
	return globalValue;
}
//#endregion
export { detectPlatform, getInheritedOrGlobal, noLeadingAtSymbol, parseJson, parseJsonWithFallback, parseJsonc };

//# sourceMappingURL=common.js.map