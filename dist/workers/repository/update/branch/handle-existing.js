import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import { emojify } from "../../../../util/emoji.js";
import { scm } from "../../../../modules/platform/scm.js";
import { ensureComment, ensureCommentRemoval } from "../../../../modules/platform/comment.js";
//#region lib/workers/repository/update/branch/handle-existing.ts
async function handleClosedPr(config, pr) {
	if (pr.state === "closed") {
		let content;
		const userStrings = config.userStrings;
		if (config.updateType === "major") content = compile(userStrings.ignoreMajor, config);
		else if (config.updateType === "digest") content = compile(userStrings.ignoreDigest, config);
		else content = compile(userStrings.ignoreOther, config);
		content += "\n\nIf you accidentally closed this PR, or if you changed your mind: rename this PR to get a fresh replacement PR.";
		if (!config.suppressNotifications.includes("prIgnoreNotification")) {
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would ensure closed PR comment in PR #${pr.number}`);
			else await ensureComment({
				number: pr.number,
				topic: userStrings.ignoreTopic,
				content
			});
		}
		if (await scm.branchExists(config.branchName)) {
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would delete branch ${config.branchName}`);
			else await scm.deleteBranch(config.branchName);
		}
	}
}
async function handleModifiedPr(config, pr) {
	if (config.suppressNotifications.includes("prEditedNotification")) return;
	const editedPrCommentTopic = "Edited/Blocked Notification";
	const content = `Renovate will not automatically rebase this PR, because it does not recognize the last commit author and assumes somebody else may have edited the PR.\n\nYou can manually request rebase by checking the rebase/retry box above.\n\n${emojify(" :warning: **Warning**: custom changes will be lost.")}`;
	if (!!config.dependencyDashboardChecks?.[config.branchName] || config.rebaseRequested) {
		logger.debug("Manual rebase has been requested for PR");
		if (GlobalConfig.get("dryRun")) {
			logger.info(`DRY-RUN: Would remove edited/blocked PR comment in PR #${pr.number}`);
			return;
		}
		logger.debug(`Removing edited/blocked PR comment in PR #${pr.number}`);
		await ensureCommentRemoval({
			type: "by-topic",
			number: pr.number,
			topic: editedPrCommentTopic
		});
	} else {
		if (GlobalConfig.get("dryRun")) {
			logger.info(`DRY-RUN: Would ensure edited/blocked PR comment in PR #${pr.number}`);
			return;
		}
		logger.debug("Ensuring comment to indicate that rebasing is not possible");
		await ensureComment({
			number: pr.number,
			topic: editedPrCommentTopic,
			content
		});
	}
}
//#endregion
export { handleClosedPr, handleModifiedPr };

//# sourceMappingURL=handle-existing.js.map