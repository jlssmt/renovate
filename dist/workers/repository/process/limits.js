import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { instrument } from "../../../instrumentation/index.js";
import { getInheritedOrGlobal } from "../../../util/common.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import { DateTime } from "luxon";
//#region lib/workers/repository/process/limits.ts
async function getPrHourlyCount(config) {
	return await instrument("getPrHourlyCount", async () => {
		try {
			const prList = await platform.getPrList();
			const currentHourStart = DateTime.utc().startOf("hour");
			logger.debug(`Calculating PRs created so far in this hour currentHourStart=${String(currentHourStart)}`);
			const soFarThisHour = prList.filter((pr) => pr.sourceBranch !== getInheritedOrGlobal("onboardingBranch") && pr.sourceBranch.startsWith(config.branchPrefix) && DateTime.fromISO(pr.createdAt).toUTC() > currentHourStart);
			logger.debug(`${soFarThisHour.length} PRs have been created so far in this hour.`);
			return soFarThisHour.length;
		} catch (err) {
			// istanbul ignore if
			if (err instanceof ExternalHostError) throw err;
			logger.error({ err }, "Error checking PRs created per hour");
			return 0;
		}
	});
}
async function getConcurrentPrsCount(config, branches) {
	return await instrument("getConcurrentPrsCount", async () => {
		let openPrCount = 0;
		for (const { branchName } of branches) try {
			const pr = await platform.getBranchPr(branchName, config.baseBranch);
			if (pr && pr.sourceBranch !== getInheritedOrGlobal("onboardingBranch") && pr.state === "open") openPrCount++;
		} catch (err) {
			// istanbul ignore if
			if (err instanceof ExternalHostError) throw err;
		}
		logger.debug(`${openPrCount} PRs are currently open`);
		return openPrCount;
	});
}
async function getCommitsHourlyCount(branches) {
	return await instrument("getCommitsHourlyCount", async () => {
		try {
			const currentHourStart = DateTime.utc().startOf("hour");
			logger.debug(`Calculating commits so far in this hour currentHourStart=${String(currentHourStart)}, for ${branches.length} branches`);
			const cache = getCache();
			const cachedBranches = coerceArray(cache.branches);
			const fallbackUpdateDates = branches.some((branch) => !cachedBranches.find((b) => b.branchName === branch.branchName)?.commitTimestamp) ? await scm.getAllBranchUpdateDates() : {};
			let soFarThisHour = 0;
			for (const branch of branches) {
				const branchCache = cachedBranches.find((b) => b.branchName === branch.branchName);
				if (branchCache?.commitTimestamp) {
					if (DateTime.fromISO(branchCache.commitTimestamp).toUTC() > currentHourStart) soFarThisHour++;
				} else {
					const updateDate = fallbackUpdateDates[branch.branchName];
					if (updateDate && updateDate > currentHourStart) soFarThisHour++;
				}
			}
			logger.debug(`${soFarThisHour} commits so far in this hour.`);
			return soFarThisHour;
		} catch (err) {
			logger.error({ err }, "Error checking commits per hour");
			return 0;
		}
	});
}
async function getConcurrentBranchesCount(branches) {
	return await instrument("getConcurrentBranchesCount", async () => {
		let existingBranchCount = 0;
		for (const branch of branches) if (await scm.branchExists(branch.branchName)) existingBranchCount++;
		logger.debug(`${existingBranchCount} already existing branches found.`);
		return existingBranchCount;
	});
}
//#endregion
export { getCommitsHourlyCount, getConcurrentBranchesCount, getConcurrentPrsCount, getPrHourlyCount };

//# sourceMappingURL=limits.js.map