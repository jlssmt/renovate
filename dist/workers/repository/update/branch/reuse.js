import { logger } from "../../../../logger/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
//#region lib/workers/repository/update/branch/reuse.ts
async function shouldKeepUpdated(config, _baseBranch, _branchName) {
	const keepUpdatedLabel = config.keepUpdatedLabel;
	if (!keepUpdatedLabel) return false;
	if ((await platform.getBranchPr(config.branchName, config.baseBranch))?.labels?.includes(keepUpdatedLabel)) return true;
	return false;
}
async function shouldReuseExistingBranch(config) {
	const { baseBranch, branchName } = config;
	const result = {
		...config,
		reuseExistingBranch: false
	};
	const keepUpdated = await shouldKeepUpdated(result, baseBranch, branchName);
	await determineRebaseWhenValue(result, keepUpdated);
	if (!await scm.branchExists(branchName)) {
		logger.debug(`Branch needs creating`);
		return result;
	}
	logger.debug(`Branch already exists`);
	if (result.rebaseWhen === "behind-base-branch" || keepUpdated) {
		if (await scm.isBranchBehindBase(branchName, baseBranch)) {
			logger.debug(`Branch is behind base branch and needs rebasing`);
			if (await scm.isBranchModified(branchName, baseBranch)) {
				logger.debug("Cannot rebase branch as it has been modified");
				result.reuseExistingBranch = true;
				result.isModified = true;
				return result;
			}
			logger.debug("Branch is unmodified, so can be rebased");
			return result;
		}
		logger.debug("Branch is up-to-date");
	} else logger.debug(`Skipping behind base branch check due to rebaseWhen=${result.rebaseWhen}`);
	result.isConflicted = await scm.isBranchConflicted(baseBranch, branchName);
	if (result.isConflicted) {
		logger.debug("Branch is conflicted");
		if (await scm.isBranchModified(branchName, baseBranch) === false) {
			logger.debug(`Branch is not mergeable and needs rebasing`);
			if (result.rebaseWhen === "never" && !keepUpdated) {
				logger.debug("Rebasing disabled by config");
				result.reuseExistingBranch = true;
				result.isModified = false;
			}
			return result;
		}
		logger.debug(`Branch is not mergeable but can't be rebased`);
	}
	logger.debug(`Branch does not need rebasing`);
	const groupedByPackageFile = {};
	for (const upgrade of result.upgrades) {
		const packageFile = upgrade.packageFile;
		groupedByPackageFile[packageFile] ??= /* @__PURE__ */ new Set();
		groupedByPackageFile[packageFile].add(upgrade.rangeStrategy);
		if (groupedByPackageFile[packageFile].size > 1 && groupedByPackageFile[packageFile].has("update-lockfile")) {
			logger.debug(`Detected multiple rangeStrategies along with update-lockfile`);
			result.reuseExistingBranch = false;
			result.isModified = false;
			return result;
		}
	}
	result.reuseExistingBranch = true;
	result.isModified = false;
	return result;
}
/**
* This method updates rebaseWhen value when it's set to auto(default) or automerging
*
* @param result BranchConfig
* @param keepUpdated boolean
*/
async function determineRebaseWhenValue(result, keepUpdated) {
	if (result.rebaseWhen === "auto" || result.rebaseWhen === "automerging") {
		let reason;
		let newValue = "behind-base-branch";
		if (keepUpdated) reason = "keep-updated label is set";
		else if (await platform.isBranchMergeQueueEnabled?.(result.baseBranch)) {
			newValue = "conflicted";
			reason = "base branch has a merge queue";
		} else if (result.automerge === true) reason = "automerge=true";
		else if (result.rebaseWhen === "automerging") {
			newValue = "never";
			reason = "no keep-updated label and automerging is set";
		} else if (await platform.getBranchForceRebase?.(result.baseBranch)) reason = "platform is configured to require up-to-date branches";
		else {
			newValue = "conflicted";
			reason = "no rule for behind-base-branch applies";
		}
		logger.debug(`Converting rebaseWhen=${result.rebaseWhen} to rebaseWhen=${newValue} because ${reason}`);
		result.rebaseWhen = newValue;
	}
}
//#endregion
export { shouldReuseExistingBranch };

//# sourceMappingURL=reuse.js.map