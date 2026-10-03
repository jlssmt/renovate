import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { getDatasourceList } from "../../../../modules/datasource/index.js";
//#region lib/workers/global/config/parse/host-rules-from-env.ts
function isAuthField(x) {
	return x === "token" || x === "username" || x === "password";
}
function isHttpsAuthField(x) {
	return x === "httpscertificate" || x === "httpsprivatekey" || x === "httpscertificateauthority";
}
function restoreHttpsAuthField(x) {
	switch (x) {
		case "httpsprivatekey": return "httpsPrivateKey";
		case "httpscertificate": return "httpsCertificate";
		case "httpscertificateauthority": return "httpsCertificateAuthority";
	}
	return x;
}
function setHostRuleValue(rule, key, value) {
	if (value !== void 0) switch (key) {
		case "token":
		case "username":
		case "password":
		case "httpsCertificateAuthority":
		case "httpsCertificate":
		case "httpsPrivateKey": rule[key] = value;
	}
}
function hostRulesFromEnv(env) {
	const datasources = new Set(getDatasourceList());
	const platforms = /* @__PURE__ */ new Set(["github"]);
	const hostRules = [];
	const npmEnvPrefixes = [
		"npm_config_",
		"npm_lifecycle_",
		"npm_package_"
	];
	for (const envName of Object.keys(env).sort()) {
		if (["GITHUB_COM_TOKEN", "RENOVATE_GITHUB_COM_TOKEN"].includes(envName)) continue;
		if (npmEnvPrefixes.some((prefix) => envName.startsWith(prefix))) {
			logger.trace(`Ignoring npm env: ${envName}`);
			continue;
		}
		const splitEnv = envName.replace(regEx(/^RENOVATE_/), "").toLowerCase().replace(regEx(/__/g), "-").split("_");
		const hostType = splitEnv.shift();
		if (datasources.has(hostType) || platforms.has(hostType) && splitEnv.length > 1) {
			let suffix = splitEnv.pop();
			if (isAuthField(suffix) || isHttpsAuthField(suffix)) {
				suffix = restoreHttpsAuthField(suffix);
				let matchHost = void 0;
				setHostRuleValue({}, suffix, env[envName]);
				if (splitEnv.length === 0) {} else if (splitEnv.length === 1) {
					logger.warn({ env: envName }, "Cannot parse env");
					continue;
				} else matchHost = splitEnv.join(".");
				const existingRule = hostRules.find((hr) => hr.hostType === hostType && hr.matchHost === matchHost);
				logger.debug(`Converting ${envName} into a global host rule`);
				if (existingRule) setHostRuleValue(existingRule, suffix, env[envName]);
				else {
					const newRule = { hostType };
					if (matchHost) newRule.matchHost = matchHost;
					setHostRuleValue(newRule, suffix, env[envName]);
					hostRules.push(newRule);
				}
			}
		}
	}
	return hostRules;
}
//#endregion
export { hostRulesFromEnv };

//# sourceMappingURL=host-rules-from-env.js.map