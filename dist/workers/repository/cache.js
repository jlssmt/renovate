import "../../constants/error-messages.js";
import { logger } from "../../logger/index.js";
import { getCache } from "../../util/cache/repository/index.js";
import { getCachedBehindBaseResult } from "../../util/git/behind-base-branch-cache.js";
import { getCachedConflictResult } from "../../util/git/conflicts-cache.js";
import { getCachedModifiedResult } from "../../util/git/modified-cache.js";
import { scm } from "../../modules/platform/scm.js";
import { platform } from "../../modules/platform/index.js";
import { getCachedPristineResult } from "../../util/git/pristine.js";
import { getPrCache } from "./update/pr/pr-cache.js";
//#region lib/workers/repository/cache.ts
function generateBranchUpgradeCache(upgrade) {
	const { datasource, depName, depType, displayPending, manager, packageName, fixedVersion, currentVersion, newVersion, currentValue, newValue, currentDigest, newDigest, packageFile, sourceUrl, remediationNotPossible, updateType, isVulnerabilityAlert } = upgrade;
	const result = {
		datasource,
		depName,
		depType,
		displayPending,
		manager,
		fixedVersion,
		currentVersion,
		currentValue,
		newValue,
		newVersion,
		currentDigest,
		newDigest,
		packageFile,
		sourceUrl,
		remediationNotPossible,
		updateType,
		isVulnerabilityAlert
	};
	if (packageName) result.packageName = packageName;
	return result;
}
async function generateBranchCache(branch) {
	const { baseBranch, branchName, prBlockedBy, prTitle, result } = branch;
	try {
		const branchSha = await scm.getBranchCommit(branchName);
		const baseBranchSha = await scm.getBranchCommit(baseBranch);
		const pristine = getCachedPristineResult(branchName);
		let prNo = null;
		let isModified;
		let isBehindBase;
		let isConflicted;
		let commitTimestamp;
		if (baseBranchSha && branchSha) {
			const branchPr = await platform.getBranchPr(branchName, baseBranch);
			if (branchPr) prNo = branchPr.number;
			isModified = getCachedModifiedResult(branchName, branchSha) ?? void 0;
			isBehindBase = getCachedBehindBaseResult(branchName, branchSha, baseBranch, baseBranchSha) ?? void 0;
			isConflicted = getCachedConflictResult(branchName, branchSha, baseBranch, baseBranchSha) ?? void 0;
			const commitDate = await scm.getBranchUpdateDate(branchName);
			if (commitDate) commitTimestamp = commitDate.toISO();
		} else if (baseBranchSha && !branchSha && branch.prNo) prNo = branch.prNo;
		const automerge = !!branch.automerge;
		const upgrades = branch.upgrades ? branch.upgrades.map(generateBranchUpgradeCache) : [];
		const commitFingerprint = branch.commitFingerprint;
		const prCache = getPrCache(branchName);
		return {
			automerge,
			baseBranchSha,
			baseBranch,
			commitFingerprint,
			commitTimestamp,
			branchName,
			isBehindBase,
			isConflicted,
			isModified,
			prBlockedBy,
			pristine,
			prCache,
			prNo,
			prTitle,
			result,
			sha: branchSha,
			upgrades
		};
	} catch (error) {
		const err = error.err ?? error;
		// istanbul ignore if
		if ([401, 404].includes(err.response?.statusCode)) {
			logger.warn({
				err,
				branchName
			}, "HTTP error generating branch cache");
			return null;
		}
		if (err.message === "repository-changed") throw err;
		logger.error({
			err,
			branchName
		}, "Error generating branch cache");
		return null;
	}
}
async function setBranchCache(branches) {
	const branchCaches = [];
	for (const branch of branches) {
		const branchCache = await generateBranchCache(branch);
		if (branchCache) branchCaches.push(branchCache);
	}
	getCache().branches = branchCaches;
}
//#endregion
export { setBranchCache };

//# sourceMappingURL=cache.js.map