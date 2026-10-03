import { addMeta, logger, removeMeta } from "../../../logger/index.js";
import { flattenUpdates } from "./flatten.js";
import { generateBranchConfig } from "./generate.js";
//#region lib/workers/repository/updates/branchify.ts
async function branchifyUpgrades(config, packageFiles) {
	logger.debug("branchifyUpgrades");
	const updates = await flattenUpdates(config, packageFiles);
	logger.debug(`${updates.length} flattened updates found: ${updates.map((u) => u.depName).filter((txt) => txt?.trim().length).join(", ")}`);
	const errors = [];
	const warnings = [];
	const branchUpgrades = {};
	const branches = [];
	for (const u of updates) {
		const update = { ...u };
		branchUpgrades[update.branchName] = branchUpgrades[update.branchName] || [];
		branchUpgrades[update.branchName] = [update].concat(branchUpgrades[update.branchName]);
	}
	logger.debug(`Returning ${Object.keys(branchUpgrades).length} branch(es)`);
	for (const branchName of Object.keys(branchUpgrades)) {
		addMeta({ branch: branchName });
		const seenUpdates = {};
		branchUpgrades[branchName] = branchUpgrades[branchName].reverse().filter((upgrade) => {
			const { manager, packageFile, depName, currentValue, newValue } = upgrade;
			const upgradeKey = `${packageFile}:${depName}:${currentValue}`;
			const previousNewValue = seenUpdates[upgradeKey];
			if (previousNewValue && previousNewValue !== newValue) {
				logger.info({
					manager,
					packageFile,
					depName,
					currentValue,
					previousNewValue,
					thisNewValue: newValue
				}, "Ignoring upgrade collision");
				return false;
			}
			seenUpdates[upgradeKey] = newValue;
			return true;
		}).reverse();
		const branch = generateBranchConfig(branchUpgrades[branchName]);
		branch.branchName = branchName;
		branch.packageFiles = packageFiles;
		branches.push(branch);
	}
	removeMeta(["branch"]);
	logger.debug(`config.repoIsOnboarded=${config.repoIsOnboarded}`);
	const branchList = config.repoIsOnboarded ? branches.map((upgrade) => upgrade.branchName) : config.branchList;
	// istanbul ignore next
	try {
		const branchUpdates = {};
		for (const branch of branches) {
			const { sourceUrl, branchName, depName, newVersion } = branch;
			if (sourceUrl && newVersion) {
				const key = `${sourceUrl}|${newVersion}`;
				branchUpdates[key] = branchUpdates[key] || {};
				if (!branchUpdates[key][branchName]) branchUpdates[key][branchName] = depName;
			}
		}
		for (const [key, value] of Object.entries(branchUpdates)) if (Object.keys(value).length > 1) {
			const [sourceUrl, newVersion] = key.split("|");
			logger.debug({
				sourceUrl,
				newVersion,
				branches: value
			}, "Found sourceUrl with multiple branches that should probably be combined into a group");
		}
	} catch (err) {
		logger.debug({ err }, "Error checking branch duplicates");
	}
	return {
		errors: config.errors.concat(errors),
		warnings: config.warnings.concat(warnings),
		branches,
		branchList
	};
}
//#endregion
export { branchifyUpgrades };

//# sourceMappingURL=branchify.js.map