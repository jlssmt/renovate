import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { instrument } from "../../../instrumentation/index.js";
import { isCustomManager } from "../../../modules/manager/custom/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { hashMap } from "../../../modules/manager/fingerprint.generated.js";
import { getEnabledManagersList } from "../../../modules/manager/index.js";
import { getManagerConfig } from "../../../config/index.js";
import { hasVulnerabilityAlertsRules } from "./vulnerability-alerts.js";
import { getMatchingFiles } from "./file-match.js";
import { getManagerPackageFiles } from "./manager-files.js";
import { processSupersedesManagers } from "./supersedes.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/workers/repository/extract/index.ts
async function extractAllDependencies(config) {
	const managerList = getEnabledManagersList(config.enabledManagers);
	const extractList = [];
	const fileList = await scm.getFileList();
	const hasAlertRules = hasVulnerabilityAlertsRules(config);
	function tryConfig(managerConfig) {
		const matchingFileList = getMatchingFiles(managerConfig, fileList);
		if (matchingFileList.length) extractList.push({
			...managerConfig,
			hasVulnerabilityAlertsRules: hasAlertRules,
			fileList: matchingFileList
		});
	}
	instrument("filter packageFiles for managers", () => {
		for (const manager of managerList) {
			const managerConfig = getManagerConfig(config, manager);
			managerConfig.manager = manager;
			if (isCustomManager(manager)) {
				const filteredCustomManagers = coerceArray(config.customManagers).filter((mgr) => mgr.customType === manager);
				for (const customManager of filteredCustomManagers) tryConfig(mergeChildConfig(managerConfig, customManager));
			} else tryConfig(managerConfig);
		}
	});
	const extractResult = {
		packageFiles: {},
		extractionFingerprints: {}
	};
	for (const { manager } of extractList) extractResult.extractionFingerprints[manager] = hashMap.get(manager);
	const extractDurations = {};
	const extractResults = await Promise.all(extractList.map(async (managerConfig) => {
		const start = Date.now();
		const packageFiles = await instrument(managerConfig.manager, async () => await getManagerPackageFiles(managerConfig));
		const durationMs = Math.round(Date.now() - start);
		extractDurations[managerConfig.manager] = durationMs;
		return {
			manager: managerConfig.manager,
			packageFiles
		};
	}));
	processSupersedesManagers(extractResults);
	const sortedExtractDurations = Object.keys(extractDurations).sort().reduce((acc, key) => {
		acc[key] = extractDurations[key];
		return acc;
	}, {});
	logger.debug({ managers: sortedExtractDurations }, "manager extract durations (ms)");
	let fileCount = 0;
	for (const { manager, packageFiles } of extractResults) if (packageFiles?.length) {
		fileCount += packageFiles.length;
		logger.debug(`Found ${manager} package files`);
		extractResult.packageFiles[manager] = (extractResult.packageFiles[manager] || []).concat(packageFiles);
	}
	logger.debug(`Found ${fileCount} package file(s)`);
	if (isNonEmptyArray(config.enabledManagers)) {
		for (const enabledManager of config.enabledManagers) if (!(enabledManager.replace("custom.", "") in extractResult.packageFiles)) logger.debug({ manager: enabledManager }, `Manager explicitly enabled in "enabledManagers" config, but found no results. Possible config error?`);
	}
	return extractResult;
}
//#endregion
export { extractAllDependencies };

//# sourceMappingURL=index.js.map