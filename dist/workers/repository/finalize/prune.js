import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { uniqueStrings } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { getBranchList, setUserRepoConfig } from "../../../util/git/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import { ensureComment } from "../../../modules/platform/comment.js";
import { isMultiBaseBranch } from "../process/index.js";
import { getReconfigureBranchName } from "../reconfigure/utils.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/workers/repository/finalize/prune.ts
async function cleanUpBranches(config, remainingBranches) {
	if (!config.pruneStaleBranches) {
		logger.debug("Branch/PR pruning is disabled - skipping");
		return;
	}
	setUserRepoConfig(config);
	const multiBase = isMultiBaseBranch(config);
	const baseBranchRe = multiBase ? calculateBaseBranchRegex(config) : null;
	for (const branchName of remainingBranches) try {
		let baseBranch;
		if (multiBase) baseBranch = baseBranchRe?.exec(branchName)?.[1] ?? config.defaultBranch;
		else baseBranch = config.baseBranches?.[0] ?? config.defaultBranch;
		const pr = await platform.findPr({
			branchName,
			state: "open",
			targetBranch: baseBranch
		});
		const branchIsModified = await scm.isBranchModified(branchName, baseBranch);
		if (pr) {
			if (branchIsModified) {
				logger.debug({
					prNo: pr.number,
					prTitle: pr.title
				}, "Branch is modified - skipping PR autoclosing");
				if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would update PR title and ensure comment.`);
				else {
					if (!pr.title.endsWith("- abandoned")) {
						const newPrTitle = `${pr.title} - abandoned`;
						await platform.updatePr({
							number: pr.number,
							prTitle: newPrTitle,
							state: "open"
						});
					}
					await ensureComment({
						number: pr.number,
						topic: "Autoclosing Skipped",
						content: "This PR has been flagged for autoclosing. However, it is being skipped due to the branch being already modified. Please close/delete it manually or report a bug if you think this is in error."
					});
				}
			} else if (GlobalConfig.get("dryRun")) logger.info({
				prNo: pr.number,
				prTitle: pr.title
			}, `DRY-RUN: Would autoclose PR`);
			else {
				logger.info({
					branchName,
					prNo: pr.number,
					prTitle: pr.title
				}, "Autoclosing PR");
				let newPrTitle = pr.title;
				if (!pr.title.endsWith("- autoclosed")) newPrTitle += " - autoclosed";
				await platform.updatePr({
					number: pr.number,
					prTitle: newPrTitle,
					state: "closed"
				});
				await scm.deleteBranch(branchName);
			}
		} else if (branchIsModified) logger.debug({ branch: branchName }, "Orphan Branch is modified - skipping branch deletion");
		else if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would delete orphan branch ${branchName}`);
		else {
			logger.info({ branch: branchName }, `Deleting orphan branch`);
			await scm.deleteBranch(branchName);
		}
	} catch (err) /* istanbul ignore next */ {
		if (err.message === "config-validation") logger.debug("Cannot prune branch due to collision between tags and branch names");
		else if (err.message?.includes("bad revision 'origin/")) logger.debug({ branchName }, "Branch not found on origin when attempting to prune");
		else if (err.message !== "repository-changed") logger.warn({
			err,
			branch: branchName
		}, "Error pruning branch");
	}
}
/**
* Calculates a {RegExp} to extract the base branch from a branch name if base branch patterns is configured.
* @param config Renovate configuration
*/
function calculateBaseBranchRegex(config) {
	if (!config.baseBranchPatterns?.length || !config.baseBranches?.length) return null;
	const branchPrefixes = [config.branchPrefix, config.branchPrefixOld].filter(isNonEmptyStringAndNotWhitespace).filter(uniqueStrings).map((prefix) => RegExp.escape(prefix));
	const baseBranches = config.baseBranches.map((branch) => RegExp.escape(branch));
	return regEx(`^(?:${branchPrefixes.join("|")})(${baseBranches.join("|")})-`);
}
async function pruneStaleBranches(config, branchList) {
	logger.debug("Removing any stale branches");
	logger.trace({ config }, `pruneStaleBranches`);
	logger.debug(`config.repoIsOnboarded=${config.repoIsOnboarded}`);
	if (!branchList) {
		logger.debug("No branchList");
		return;
	}
	if (!config.defaultBranch) {
		logger.debug("No defaultBranch set - skipping branch pruning");
		return;
	}
	if (!isNonEmptyStringAndNotWhitespace(config.branchPrefix)) {
		logger.warn("config.branchPrefix is empty - skipping branch pruning to avoid treating all branches as Renovate-managed");
		return;
	}
	let renovateBranches = getBranchList().filter((branchName) => branchName.startsWith(config.branchPrefix) && branchName !== getReconfigureBranchName(config.branchPrefix));
	if (!renovateBranches?.length) {
		logger.debug("No renovate branches found");
		return;
	}
	logger.debug({
		branchList: branchList?.sort(),
		renovateBranches: renovateBranches?.sort()
	}, "Branch lists");
	const lockFileBranch = `${config.branchPrefix}lock-file-maintenance`;
	renovateBranches = renovateBranches.filter((branch) => branch !== lockFileBranch);
	const remainingBranches = renovateBranches.filter((branch) => !branchList.includes(branch));
	logger.debug(`remainingBranches=${String(remainingBranches)}`);
	if (remainingBranches.length === 0) {
		logger.debug("No branches to clean up");
		return;
	}
	await cleanUpBranches(config, remainingBranches);
}
//#endregion
export { pruneStaleBranches };

//# sourceMappingURL=prune.js.map