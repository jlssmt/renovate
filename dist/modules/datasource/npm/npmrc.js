import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { fromBase64 } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, isHttpUrl } from "../../../util/url.js";
import { add } from "../../../util/host-rules.js";
import { defaultRegistryUrl } from "./common.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
import ini from "ini";
//#region lib/modules/datasource/npm/npmrc.ts
let npmrc = {};
let npmrcRaw = "";
let packageRules = [];
function envReplace(value, env = getEnv()) {
	/* v8 ignore next -- TODO: add test */
	if (!isString(value)) return value;
	const ENV_EXPR = regEx(/(?<esc>\\*)\$\{(?<envVarName>[^}]+)\}/g);
	return value.replace(ENV_EXPR, (match, _esc, envVarName) => {
		if (env[envVarName] === void 0) {
			logger.warn({ match }, "Failed to replace env in config");
			throw new Error("env-replace");
		}
		return env[envVarName];
	});
}
function getMatchHostFromNpmrcHost(input) {
	if (input.startsWith("//")) {
		const matchHost = input.replace("//", "");
		if (matchHost.includes("/")) return `https://${matchHost}`;
		return matchHost;
	}
	return input;
}
function convertNpmrcToRules(npmrc) {
	const rules = {
		hostRules: [],
		packageRules: []
	};
	const hostType = "npm";
	const hosts = {};
	for (const [key, value] of Object.entries(npmrc)) {
		if (!isNonEmptyString(value)) continue;
		const keyParts = key.split(":");
		const keyType = keyParts.pop();
		let matchHost = "";
		if (keyParts.length) matchHost = getMatchHostFromNpmrcHost(keyParts.join(":"));
		const rule = hosts[matchHost] || {};
		if (keyType === "_authToken" || keyType === "_auth") {
			rule.token = value;
			if (keyType === "_auth") rule.authType = "Basic";
		} else if (keyType === "username") rule.username = value;
		else if (keyType === "_password") rule.password = fromBase64(value);
		else continue;
		hosts[matchHost] = rule;
	}
	for (const [matchHost, rule] of Object.entries(hosts)) {
		const hostRule = {
			...rule,
			hostType
		};
		if (matchHost) hostRule.matchHost = matchHost;
		rules.hostRules?.push(hostRule);
	}
	const matchDatasources = ["npm"];
	const { registry } = npmrc;
	if (isNonEmptyString(registry)) {
		if (isHttpUrl(registry)) rules.packageRules?.push({
			matchDatasources,
			registryUrls: [registry]
		});
		else logger.warn({ registry }, "Invalid npmrc registry= URL");
	}
	for (const [key, value] of Object.entries(npmrc)) {
		if (!isNonEmptyString(value)) continue;
		const keyParts = key.split(":");
		if (keyParts.pop() === "registry" && keyParts.length && isNonEmptyString(value)) {
			const scope = keyParts.join(":");
			if (isHttpUrl(value)) rules.packageRules?.push({
				matchDatasources,
				matchPackageNames: [`${scope}/**`],
				registryUrls: [value]
			});
			else logger.warn({
				scope,
				registry: value
			}, "Invalid npmrc registry= URL");
		}
	}
	return rules;
}
function setNpmrc(input) {
	if (input) {
		if (input === npmrcRaw) return;
		const existingNpmrc = npmrc;
		npmrcRaw = input;
		logger.debug("Setting npmrc");
		npmrc = ini.parse(input.replace(regEx(/\\n/g), "\n"));
		const exposeAllEnv = GlobalConfig.get("exposeAllEnv");
		for (const [key, val] of Object.entries(npmrc)) if (!exposeAllEnv && key.endsWith("registry") && isString(val) && val.includes("localhost")) {
			logger.debug({
				key,
				val
			}, "Detected localhost registry - rejecting npmrc file");
			npmrc = existingNpmrc;
			return;
		}
		if (exposeAllEnv) for (const key of Object.keys(npmrc)) npmrc[key] = envReplace(npmrc[key]);
		const npmrcRules = convertNpmrcToRules(npmrc);
		if (npmrcRules.hostRules?.length) npmrcRules.hostRules.forEach((hostRule) => add(hostRule));
		packageRules = npmrcRules.packageRules;
	} else {
		logger.debug("Resetting npmrc");
		npmrc = {};
		npmrcRaw = "";
		packageRules = [];
	}
}
function resolveRegistryUrl(packageName) {
	let registryUrl = defaultRegistryUrl;
	for (const rule of packageRules) {
		const { matchPackageNames, registryUrls } = rule;
		if (!matchPackageNames || packageName.startsWith(matchPackageNames[0].replace(regEx(/\*\*$/), ""))) registryUrl = registryUrls[0];
	}
	return registryUrl;
}
function resolvePackageUrl(registryUrl, packageName) {
	return new URL(encodeURIComponent(packageName).replace(regEx(/^%40/), "@"), ensureTrailingSlash(registryUrl)).href;
}
//#endregion
export { convertNpmrcToRules, getMatchHostFromNpmrcHost, resolvePackageUrl, resolveRegistryUrl, setNpmrc };

//# sourceMappingURL=npmrc.js.map