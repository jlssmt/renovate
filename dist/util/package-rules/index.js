import { coerceArray } from "../array.js";
import { logger } from "../../logger/index.js";
import { mergeChildConfig } from "../../config/utils.js";
import { compile } from "../template/index.js";
import matchers from "./matchers.js";
import { isNonEmptyArray, isNullOrUndefined, isString, isTruthy } from "@sindresorhus/is";
import _slugify from "slugify";
//#region lib/util/package-rules/index.ts
const slugify = _slugify;
async function matchesRule(inputConfig, packageRule) {
	for (const matcher of matchers) {
		const isMatch = await matcher.matches(inputConfig, packageRule);
		if (isNullOrUndefined(isMatch)) continue;
		if (!isTruthy(isMatch)) return false;
	}
	return true;
}
async function applyPackageRules(inputConfig, stageName) {
	let config = { ...inputConfig };
	const packageRules = coerceArray(config.packageRules);
	delete config.packageRules;
	logger.trace({
		dependency: config.depName,
		packageRules
	}, `Checking against ${packageRules.length} packageRules`);
	for (const packageRule of packageRules) if (await matchesRule(config, packageRule)) {
		const toApply = removeMatchers({ ...packageRule });
		if (config.groupSlug && packageRule.groupName && !packageRule.groupSlug) toApply.groupSlug = slugify(packageRule.groupName, { lower: true });
		if (toApply.force?.enabled === false || toApply.enabled === false && config.enabled !== false) {
			config.skipReason = "package-rules";
			if (stageName) config.skipStage = stageName;
		}
		if ((toApply.force?.enabled || toApply.enabled) && config.skipReason !== "unknown-registry") {
			delete config.skipReason;
			delete config.skipStage;
		}
		if (isString(toApply.overrideDatasource) && toApply.overrideDatasource !== config.datasource) {
			logger.debug(`Overriding datasource from ${config.datasource} to ${toApply.overrideDatasource} for ${config.depName}`);
			config.datasource = toApply.overrideDatasource;
		}
		if (isString(toApply.overrideDepName) && toApply.overrideDepName !== config.depName) {
			logger.debug(`Overriding depName from ${config.depName} to ${toApply.overrideDepName}`);
			config.depName = compile(toApply.overrideDepName, config);
		}
		if (isString(toApply.overridePackageName) && toApply.overridePackageName !== config.packageName) {
			logger.debug(`Overriding packageName from ${config.packageName} to ${toApply.overridePackageName} for ${config.depName}`);
			config.packageName = compile(toApply.overridePackageName, config);
		}
		if (isString(toApply.sourceUrl)) toApply.sourceUrl = compile(toApply.sourceUrl, config);
		delete toApply.overrideDatasource;
		delete toApply.overrideDepName;
		delete toApply.overridePackageName;
		config = mergeChildConfig(config, toApply);
	}
	if (config.skipReason === "unknown-registry" && (isNonEmptyArray(config.registryUrls) || isNonEmptyArray(config.defaultRegistryUrls))) {
		delete config.skipReason;
		delete config.skipStage;
	}
	if (config.packageRules) config.packageRules = packageRules.concat(config.packageRules);
	else if ("packageRules" in inputConfig) config.packageRules = inputConfig.packageRules;
	return config;
}
function removeMatchers(packageRule) {
	for (const key of Object.keys(packageRule)) if (key.startsWith("match") || key.startsWith("exclude")) delete packageRule[key];
	return packageRule;
}
//#endregion
export { applyPackageRules };

//# sourceMappingURL=index.js.map