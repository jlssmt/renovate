import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { isScheduledNow } from "../branch/schedule.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { ensureComment, ensureCommentRemoval } from "../../../../modules/platform/comment.js";
import { resolveBranchStatus } from "../branch/status-checks.js";
//#region lib/workers/repository/update/pr/automerge.ts
async function checkAutoMerge(pr, config) {
	logger.trace({ config }, "checkAutoMerge");
	const { branchName, baseBranch, automergeType, automergeStrategy, pruneBranchAfterAutomerge, automergeComment, ignoreTests, rebaseRequested } = config;
	if (!isScheduledNow(config, "automergeSchedule")) {
		logger.debug(`PR automerge is off schedule`);
		return {
			automerged: false,
			prAutomergeBlockReason: "off schedule"
		};
	}
	const mergeQueueEnabled = await platform.isBranchMergeQueueEnabled?.(baseBranch);
	if (mergeQueueEnabled && await platform.isPrInMergeQueue?.(pr.number)) {
		logger.debug(`PR #${pr.number} is already in the merge queue`);
		return {
			automerged: false,
			prAutomergeBlockReason: "InMergeQueue"
		};
	}
	if (config.isConflicted ?? await scm.isBranchConflicted(baseBranch, branchName)) {
		logger.debug("PR is conflicted");
		return {
			automerged: false,
			prAutomergeBlockReason: "Conflicted"
		};
	}
	if (!ignoreTests && pr.cannotMergeReason) {
		logger.debug(`Platform reported that PR is not ready for merge. Reason: [${pr.cannotMergeReason}]`);
		return {
			automerged: false,
			prAutomergeBlockReason: "PlatformNotReady"
		};
	}
	const branchStatus = await resolveBranchStatus(branchName, !!config.internalChecksAsSuccess, config.ignoreTests);
	if (branchStatus !== "green") {
		logger.debug(`PR is not ready for merge (branch status is ${branchStatus})`);
		return {
			automerged: false,
			prAutomergeBlockReason: "BranchNotGreen"
		};
	}
	if (await scm.isBranchModified(branchName, baseBranch)) {
		logger.debug("PR is ready for automerge but has been modified");
		return {
			automerged: false,
			prAutomergeBlockReason: "BranchModified"
		};
	}
	if (automergeType === "pr-comment") {
		logger.debug(`Applying automerge comment: ${automergeComment}`);
		// istanbul ignore if
		if (GlobalConfig.get("dryRun")) {
			logger.info(`DRY-RUN: Would add PR automerge comment to PR #${pr.number}`);
			return {
				automerged: false,
				prAutomergeBlockReason: "DryRun"
			};
		}
		if (rebaseRequested) await ensureCommentRemoval({
			type: "by-content",
			number: pr.number,
			content: automergeComment
		});
		await ensureComment({
			number: pr.number,
			topic: null,
			content: automergeComment
		});
		return {
			automerged: true,
			branchRemoved: false
		};
	}
	// istanbul ignore if
	if (GlobalConfig.get("dryRun")) {
		logger.info(`DRY-RUN: Would merge PR #${pr.number} with strategy "${automergeStrategy}"`);
		return {
			automerged: false,
			prAutomergeBlockReason: "DryRun"
		};
	}
	logger.debug(`Automerging #${pr.number} with strategy ${automergeStrategy}`);
	if (await platform.mergePr({
		branchName,
		id: pr.number,
		strategy: automergeStrategy
	})) {
		if (mergeQueueEnabled) {
			logger.info({
				pr: pr.number,
				prTitle: pr.title
			}, "PR added to the merge queue");
			return {
				automerged: false,
				prAutomergeBlockReason: "InMergeQueue"
			};
		}
		logger.info({
			pr: pr.number,
			prTitle: pr.title
		}, "PR automerged");
		if (!pruneBranchAfterAutomerge) {
			logger.info("Skipping pruning of merged branch");
			return {
				automerged: true,
				branchRemoved: false
			};
		}
		let branchRemoved = false;
		try {
			await scm.deleteBranch(branchName);
			branchRemoved = true;
		} catch (err) /* istanbul ignore next */ {
			logger.warn({
				branchName,
				err
			}, "Branch auto-remove failed");
		}
		return {
			automerged: true,
			branchRemoved
		};
	}
	return {
		automerged: false,
		prAutomergeBlockReason: "PlatformRejection"
	};
}
//#endregion
export { checkAutoMerge };

//# sourceMappingURL=automerge.js.map