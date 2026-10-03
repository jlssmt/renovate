import { coerceArray } from "../../../util/array.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { validMatchFields } from "../../../modules/manager/custom/utils.js";
import { isCustomManager } from "../../../modules/manager/custom/index.js";
import { getEnabledManagersList } from "../../../modules/manager/index.js";
import { getManagerConfig } from "../../../config/index.js";
import { hasVulnerabilityAlertsRules } from "./vulnerability-alerts.js";
//#region lib/workers/repository/extract/extract-fingerprint-config.ts
function getCustomManagerFields(config) {
	const regexFields = {};
	for (const field of validMatchFields.map((f) => `${f}Template`)) if (config[field]) regexFields[field] = config[field];
	return {
		autoReplaceStringTemplate: config.autoReplaceStringTemplate,
		matchStrings: config.matchStrings,
		matchStringsStrategy: config.matchStringsStrategy,
		...regexFields
	};
}
function getFilteredManagerConfig(config) {
	return {
		...isCustomManager(config.manager) && getCustomManagerFields(config),
		manager: config.manager,
		managerFilePatterns: config.managerFilePatterns,
		npmrc: config.npmrc,
		npmrcMerge: config.npmrcMerge,
		enabled: config.enabled,
		...config.hasVulnerabilityAlertsRules && { hasVulnerabilityAlertsRules: true },
		ignorePaths: coerceArray(config.ignorePaths),
		includePaths: coerceArray(config.includePaths),
		skipInstalls: config.skipInstalls,
		registryAliases: config.registryAliases,
		fileList: []
	};
}
function generateFingerprintConfig(config) {
	const managerExtractConfigs = [];
	const managerList = new Set(getEnabledManagersList(config.enabledManagers));
	const hasAlertRules = hasVulnerabilityAlertsRules(config);
	for (const manager of managerList) {
		const managerConfig = getManagerConfig(config, manager);
		if (isCustomManager(manager)) {
			const filteredCustomManagers = coerceArray(config.customManagers).filter((mgr) => mgr.customType === manager);
			for (const customManager of filteredCustomManagers) managerExtractConfigs.push({
				...mergeChildConfig(managerConfig, customManager),
				hasVulnerabilityAlertsRules: hasAlertRules,
				fileList: []
			});
		} else managerExtractConfigs.push({
			...managerConfig,
			hasVulnerabilityAlertsRules: hasAlertRules,
			fileList: []
		});
	}
	return {
		managerList,
		managers: managerExtractConfigs.map(getFilteredManagerConfig)
	};
}
//#endregion
export { generateFingerprintConfig };

//# sourceMappingURL=extract-fingerprint-config.js.map