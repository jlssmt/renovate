import { coerceObject } from "../../../util/object.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../util/common.js";
import { getCache, isCacheModified } from "../../../util/cache/repository/index.js";
import { addBranchStats } from "../../../instrumentation/reporting.js";
//#region lib/workers/repository/finalize/repository-statistics.ts
function runRenovateRepoStats(config, prList) {
	const prStats = {
		total: 0,
		open: 0,
		closed: 0,
		merged: 0
	};
	for (const pr of prList) {
		if (pr.title === "Configure Renovate" || pr.title === getInheritedOrGlobal("onboardingPrTitle")) continue;
		prStats.total += 1;
		switch (pr.state) {
			case "merged":
				prStats.merged += 1;
				break;
			case "closed":
				prStats.closed += 1;
				break;
			case "open": prStats.open += 1;
		}
	}
	logger.debug({ stats: prStats }, `Renovate repository PR statistics`);
}
function branchCacheToMetadata({ automerge, baseBranch, baseBranchSha, branchName, isModified, pristine: isPristine, sha: branchSha }) {
	return {
		automerge,
		baseBranch,
		baseBranchSha,
		branchName,
		branchSha,
		isModified,
		isPristine
	};
}
function filterDependencyDashboardData(branches) {
	const branchesFiltered = [];
	for (const branch of branches) {
		const upgradesFiltered = [];
		const { branchName, prNo, prTitle, result, upgrades, prBlockedBy } = branch;
		for (const upgrade of coerceArray(upgrades)) {
			const { datasource, depName, displayPending, fixedVersion, currentVersion, currentValue, currentDigest, newValue, newVersion, newDigest, packageFile, updateType, packageName } = upgrade;
			const filteredUpgrade = {
				datasource,
				depName,
				displayPending,
				fixedVersion,
				currentVersion,
				currentValue,
				currentDigest,
				newValue,
				newVersion,
				newDigest,
				packageFile,
				updateType,
				packageName
			};
			upgradesFiltered.push(filteredUpgrade);
		}
		const filteredBranch = {
			branchName,
			prNo,
			prTitle,
			result,
			prBlockedBy,
			upgrades: upgradesFiltered
		};
		branchesFiltered.push(filteredBranch);
	}
	return branchesFiltered;
}
function runBranchSummary(config) {
	const defaultBranch = config.defaultBranch;
	const { scan, branches } = getCache();
	const baseMetadata = [];
	for (const [branchName, cached] of Object.entries(coerceObject(scan))) baseMetadata.push({
		branchName,
		sha: cached.sha
	});
	const branchMetadata = [];
	const inactiveBranches = [];
	for (const branch of coerceArray(branches)) if (branch.sha) branchMetadata.push(branchCacheToMetadata(branch));
	else inactiveBranches.push(branch.branchName);
	const res = {
		cacheModified: isCacheModified(),
		baseBranches: baseMetadata,
		branches: branchMetadata,
		defaultBranch,
		inactiveBranches
	};
	logger.debug(res, "Branch summary");
	if (branches?.length) {
		const branchesInformation = filterDependencyDashboardData(branches);
		addBranchStats(config, branchesInformation);
		logger.debug({ branchesInformation }, "branches info extended");
		const updateSummary = getUpdateSummary(branches);
		logger.debug({ updateSummary }, "Updates summary");
	}
}
function getUpdateSummary(branches) {
	const summaryByBase = /* @__PURE__ */ new Map();
	for (const branch of branches) {
		const baseBranch = branch.baseBranch ?? "";
		let entry = summaryByBase.get(baseBranch);
		if (!entry) {
			entry = {
				baseBranch,
				total: 0,
				vulnerabilityAlert: 0,
				updates: {},
				managers: {}
			};
			summaryByBase.set(baseBranch, entry);
		}
		for (const upgrade of coerceArray(branch.upgrades)) {
			const { updateType } = upgrade;
			if (updateType) {
				entry.total += 1;
				if (upgrade.isVulnerabilityAlert) entry.vulnerabilityAlert += 1;
				entry.updates[updateType] = (entry.updates[updateType] ?? 0) + 1;
				const manager = upgrade.manager ?? "";
				let managerEntry = entry.managers[manager];
				if (!managerEntry) {
					managerEntry = {
						total: 0,
						vulnerabilityAlert: 0,
						updates: {}
					};
					entry.managers[manager] = managerEntry;
				}
				managerEntry.total += 1;
				if (upgrade.isVulnerabilityAlert) managerEntry.vulnerabilityAlert += 1;
				managerEntry.updates[updateType] = (managerEntry.updates[updateType] ?? 0) + 1;
			} else logger.debug({ upgrade }, "Found an upgrade without an updateType, which should not be possible");
		}
	}
	return Array.from(summaryByBase.values());
}
//#endregion
export { getUpdateSummary, runBranchSummary, runRenovateRepoStats };

//# sourceMappingURL=repository-statistics.js.map