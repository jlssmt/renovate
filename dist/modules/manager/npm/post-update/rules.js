import { regEx } from "../../../../util/regex.js";
import { toBase64 } from "../../../../util/string.js";
import { logger } from "../../../../logger/index.js";
import { isHttpUrl } from "../../../../util/url.js";
import { findAll, getAll } from "../../../../util/host-rules.js";
import { isNullOrUndefined, isString } from "@sindresorhus/is";
//#region lib/modules/manager/npm/post-update/rules.ts
function processHostRules() {
	const additionalYarnRcYml = { npmRegistries: {} };
	const additionalNpmrcContent = [];
	const npmHostRules = findAll({ hostType: "npm" });
	logger.debug(`Found ${npmHostRules.length} npm host rule(s)`);
	const noTypeHostRules = getAll().filter((rule) => isNullOrUndefined(rule.hostType));
	logger.debug(`Found ${noTypeHostRules.length} host rule(s) without host type`);
	const noTypeHostRulesWithoutDuplicates = noTypeHostRules.filter((rule) => !npmHostRules.some((elem) => elem.matchHost === rule.matchHost));
	logger.debug(`Found ${noTypeHostRulesWithoutDuplicates.length} host rule(s) without host type after dropping duplicates`);
	const effectiveHostRules = npmHostRules.concat(noTypeHostRulesWithoutDuplicates);
	logger.trace(`Found ${effectiveHostRules.length} effective npm host rule(s) after deduplication`);
	for (const hostRule of effectiveHostRules) {
		if (!hostRule.resolvedHost) {
			logger.debug("Skipping host rule without resolved host");
			continue;
		}
		const matchedHost = hostRule.matchHost;
		/* v8 ignore if -- unreachable: a resolvedHost implies matchHost is set (see comment above) */
		if (!matchedHost) {
			logger.debug("Skipping host rule without matchHost");
			continue;
		}
		const uri = `//${matchedHost}/`;
		let cleanedUri = uri;
		if (isHttpUrl(matchedHost)) cleanedUri = matchedHost.replace(regEx(/^https?:/), "");
		if (hostRule.token) {
			const key = hostRule.authType === "Basic" ? "_auth" : "_authToken";
			logger.debug(`Adding npmrc entry for ${cleanedUri} with key ${key}`);
			additionalNpmrcContent.push(`${cleanedUri}:${key}=${hostRule.token}`);
			if (hostRule.authType === "Basic") {
				const registry = { npmAuthIdent: hostRule.token };
				additionalYarnRcYml.npmRegistries[cleanedUri] = registry;
				additionalYarnRcYml.npmRegistries[uri] = registry;
				continue;
			}
			const registry = { npmAuthToken: hostRule.token };
			additionalYarnRcYml.npmRegistries[cleanedUri] = registry;
			additionalYarnRcYml.npmRegistries[uri] = registry;
			continue;
		}
		// v8 ignore else -- TODO: add test #40625
		if (isString(hostRule.username) && isString(hostRule.password)) {
			logger.debug(`Adding npmrc entry for ${cleanedUri} with username/password`);
			const password = toBase64(hostRule.password);
			additionalNpmrcContent.push(`${cleanedUri}:username=${hostRule.username}`);
			additionalNpmrcContent.push(`${cleanedUri}:_password=${password}`);
			const registries = { npmAuthIdent: `${hostRule.username}:${hostRule.password}` };
			additionalYarnRcYml.npmRegistries[cleanedUri] = registries;
			additionalYarnRcYml.npmRegistries[uri] = registries;
		}
	}
	return {
		additionalNpmrcContent,
		additionalYarnRcYml: Object.keys(additionalYarnRcYml.npmRegistries).length > 0 ? additionalYarnRcYml : void 0
	};
}
//#endregion
export { processHostRules };

//# sourceMappingURL=rules.js.map