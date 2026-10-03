import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { compile } from "../../../util/template/index.js";
import { getDefaultConfig } from "../../../modules/datasource/index.js";
import { get } from "../../../modules/manager/index.js";
import { filterConfig, getManagerConfig } from "../../../config/index.js";
import { detectSemanticCommits } from "../../../util/git/semantic.js";
import { replacementAlreadyExists } from "../common.js";
import { applyPackageRules } from "../../../util/package-rules/index.js";
import { generateBranchName } from "./branch-name.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/updates/flatten.ts
function upper(str) {
	return str.charAt(0).toUpperCase() + str.substring(1);
}
function sanitizeDepName(depName) {
	return depName.replace(regEx(/\$\{[^}]+\}\/?/g), "").replace(regEx(/[${}]/g), "").replace("@types/", "").replace("@", "").replace(regEx(/\//g), "-").replace(regEx(/\s+/g), "-").replace(regEx(/:/g), "-").replace(regEx(/-+/), "-").toLowerCase();
}
function applyUpdateConfig(input) {
	const updateConfig = { ...input };
	delete updateConfig.packageRules;
	updateConfig.depNameSanitized = updateConfig.depName ? sanitizeDepName(updateConfig.depName) : void 0;
	updateConfig.newNameSanitized = updateConfig.newName ? sanitizeDepName(updateConfig.newName) : void 0;
	if (updateConfig.sourceUrl) {
		const parsedSourceUrl = parseUrl(updateConfig.sourceUrl);
		if (parsedSourceUrl?.pathname) {
			updateConfig.sourceRepoSlug = parsedSourceUrl.pathname.replace(regEx(/^\//), "").replace(regEx(/\//g), "-").replace(regEx(/-+/g), "-");
			updateConfig.sourceRepo = parsedSourceUrl.pathname.replace(regEx(/^\//), "");
			updateConfig.sourceRepoOrg = updateConfig.sourceRepo.replace(regEx(/\/.*/g), "");
			updateConfig.sourceRepoName = updateConfig.sourceRepo.replace(regEx(/.*\//g), "");
		}
	}
	if (updateConfig.sourceDirectory) updateConfig.sourceDirectory = compile(updateConfig.sourceDirectory, updateConfig);
	generateBranchName(updateConfig);
	return updateConfig;
}
async function flattenUpdates(config, packageFiles) {
	const updates = [];
	const updateTypes = [
		"major",
		"minor",
		"patch",
		"pin",
		"digest",
		"lockFileMaintenance",
		"replacement"
	];
	for (const [manager, files] of Object.entries(packageFiles)) {
		const managerConfig = getManagerConfig(config, manager);
		for (const packageFile of files) {
			const packageFileConfig = mergeChildConfig(managerConfig, packageFile);
			const packagePath = packageFile.packageFile?.split("/");
			packagePath.splice(-1, 1);
			if (packagePath.length > 0) {
				packageFileConfig.parentDir = packagePath.at(-1);
				packageFileConfig.packageFileDir = packagePath.join("/");
			} else {
				packageFileConfig.parentDir = "";
				packageFileConfig.packageFileDir = "";
			}
			let depIndex = 0;
			for (const dep of packageFile.deps) {
				if (dep.updates.length) {
					const depConfig = mergeChildConfig(packageFileConfig, dep);
					delete depConfig.deps;
					depConfig.depIndex = depIndex;
					for (const update of dep.updates) {
						if (update.updateType === "replacement" && update.newName && replacementAlreadyExists(packageFile.deps, dep, update.newName)) {
							logger.debug({ fileName: packageFile.packageFile }, `Skipping replacement of ${dep.depName} with ${update.newName}: replacement already exists in ${packageFile.packageFile}`);
							continue;
						}
						let updateConfig = mergeChildConfig(depConfig, update);
						delete updateConfig.updates;
						if (updateConfig.updateType) updateConfig[`is${upper(updateConfig.updateType)}`] = true;
						if (updateConfig.updateTypes) updateConfig.updateTypes.forEach((updateType) => {
							updateConfig[`is${upper(updateType)}`] = true;
						});
						const datasourceConfig = await getDefaultConfig(depConfig.datasource);
						updateConfig = mergeChildConfig(updateConfig, datasourceConfig);
						updateConfig = await applyPackageRules(updateConfig, "datasource-merge");
						updateConfig = mergeChildConfig(updateConfig, updateConfig[updateConfig.updateType]);
						for (const updateType of updateTypes) delete updateConfig[updateType];
						updateConfig = await applyPackageRules(updateConfig, "update-type-merge");
						updateConfig = applyUpdateConfig(updateConfig);
						updateConfig.baseDeps = packageFile.deps;
						update.branchName = updateConfig.branchName;
						updateConfig.hasAttestation = depConfig.hasAttestation;
						updates.push(updateConfig);
					}
				}
				depIndex += 1;
			}
			if (get(manager, "supportsLockFileMaintenance") && packageFileConfig.lockFileMaintenance.enabled) {
				let lockFileConfig = mergeChildConfig(packageFileConfig, packageFileConfig.lockFileMaintenance);
				lockFileConfig.updateType = "lockFileMaintenance";
				lockFileConfig.isLockFileMaintenance = true;
				lockFileConfig = await applyPackageRules(lockFileConfig, "lock-file-maintenance-merge");
				lockFileConfig = mergeChildConfig(lockFileConfig, lockFileConfig.lockFileMaintenance);
				lockFileConfig = await applyPackageRules(lockFileConfig, "lock-file-maintenance-merge-2");
				for (const updateType of updateTypes) delete lockFileConfig[updateType];
				delete lockFileConfig.packageRules;
				delete lockFileConfig.deps;
				generateBranchName(lockFileConfig);
				updates.push(lockFileConfig);
			}
			if (get(manager, "updateLockedDependency")) for (const lockFile of coerceArray(packageFileConfig.lockFiles)) {
				const remediations = config.remediations?.[lockFile];
				if (remediations) for (const remediation of remediations) {
					let updateConfig = mergeChildConfig(packageFileConfig, remediation);
					updateConfig = mergeChildConfig(updateConfig, config.vulnerabilityAlerts);
					delete updateConfig.vulnerabilityAlerts;
					updateConfig.isVulnerabilityAlert = true;
					updateConfig.isRemediation = true;
					updateConfig.lockFile = lockFile;
					updateConfig.currentValue = updateConfig.currentVersion;
					updateConfig.newValue = updateConfig.newVersion;
					updateConfig = applyUpdateConfig(updateConfig);
					updateConfig.enabled = true;
					updates.push(updateConfig);
				}
			}
		}
	}
	if (config.semanticCommits === "auto") {
		const semanticCommits = await detectSemanticCommits();
		for (const update of updates) update.semanticCommits = semanticCommits;
	}
	const filteredUpdates = updates.filter((update) => update.enabled !== false).filter((update) => isUndefined(update.skipReason)).map(({ vulnerabilityAlerts: _, ...update }) => update).map((update) => filterConfig(update, "branch"));
	if (filteredUpdates.length < updates.length) logger.debug(`Filtered out ${updates.length - filteredUpdates.length} disabled update(s). ${filteredUpdates.length} update(s) remaining.`);
	return filteredUpdates;
}
//#endregion
export { applyUpdateConfig, flattenUpdates, sanitizeDepName };

//# sourceMappingURL=flatten.js.map