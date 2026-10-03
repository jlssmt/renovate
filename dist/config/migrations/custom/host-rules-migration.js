import { CONFIG_VALIDATION } from "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { migrateDatasource } from "./datasource-migration.js";
import { massageHostUrl } from "../../../util/url.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/host-rules-migration.ts
var HostRulesMigration = class extends AbstractMigration {
	propertyName = "hostRules";
	run(value) {
		const newHostRules = [];
		for (const hostRule of value) {
			validateHostRule(hostRule);
			const newRule = {};
			for (const [key, value] of Object.entries(hostRule)) {
				if (key === "platform") {
					// v8 ignore else -- TODO: add test #40625
					if (isString(value)) newRule.hostType ??= value;
					continue;
				}
				if (key === "matchHost") {
					// v8 ignore else -- TODO: add test #40625
					if (isString(value)) newRule.matchHost ??= massageHostUrl(value);
					continue;
				}
				if (key === "hostType") {
					// v8 ignore else -- TODO: add test #40625
					if (isString(value)) newRule.hostType ??= migrateDatasource(value);
					continue;
				}
				if (key === "endpoint" || key === "host" || key === "baseUrl" || key === "hostName" || key === "domainName") {
					// v8 ignore else -- TODO: add test #40625
					if (isString(value)) newRule.matchHost ??= massageHostUrl(value);
					continue;
				}
				newRule[key] = value;
			}
			newHostRules.push(newRule);
		}
		this.rewrite(newHostRules);
	}
};
function validateHostRule(rule) {
	const { matchHost, hostName, domainName, baseUrl, endpoint, host } = rule;
	const hosts = removeUndefinedFields({
		matchHost,
		hostName,
		domainName,
		baseUrl,
		endpoint,
		host
	});
	if (Object.keys(hosts).length > 1) {
		if (new Set(Object.values(hosts)).size > 1) {
			const error = new Error(CONFIG_VALIDATION);
			error.validationSource = "config";
			error.validationMessage = "`hostRules` cannot contain more than one host-matching field - use `matchHost` only.";
			error.validationError = "The renovate configuration file contains some invalid settings";
			throw error;
		} else logger.warn({ hosts }, "Duplicate host values found, please only use `matchHost` to specify the host");
	}
}
function removeUndefinedFields(obj) {
	const result = {};
	for (const key of Object.keys(obj)) if (isString(obj[key])) result[key] = obj[key];
	return result;
}
//#endregion
export { HostRulesMigration };

//# sourceMappingURL=host-rules-migration.js.map