import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { isScheduledNow } from "./schedule.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { resolveBranchStatus } from "./status-checks.js";
//#region lib/workers/repository/update/branch/automerge.ts
async function tryBranchAutomerge(config) {
	logger.debug("Checking if we can automerge branch");
	if (!(config.automerge && config.automergeType === "branch")) return "no automerge";
	if (!isScheduledNow(config, "automergeSchedule")) return "off schedule";
	if (await platform.getBranchPr(config.branchName, config.baseBranch)) return "automerge aborted - PR exists";
	const branchStatus = await resolveBranchStatus(config.branchName, !!config.internalChecksAsSuccess, config.ignoreTests);
	if (branchStatus === "green") {
		logger.debug(`Automerging branch`);
		try {
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would automerge branch ${config.branchName}`);
			else {
				await scm.checkoutBranch(config.baseBranch);
				await scm.mergeAndPush(config.branchName);
			}
			logger.info({ branch: config.branchName }, "Branch automerged");
			return "automerged";
		} catch (err) {
			/* v8 ignore if -- TODO: needs test */
			if (err.message === "not ready") {
				logger.debug("Branch is not ready for automerge");
				return "not ready";
			}
			/* v8 ignore if -- TODO: needs test */
			if (err.message.includes("refusing to merge unrelated histories") || err.message.includes("Not possible to fast-forward") || err.message.includes("Updates were rejected because the tip of your current branch is behind")) {
				logger.debug({ err }, "Branch automerge error");
				logger.info("Branch is not up to date - cannot automerge");
				return "stale";
			}
			if (await platform.isBranchMergeQueueEnabled?.(config.baseBranch)) {
				logger.warn({
					baseBranch: config.baseBranch,
					err
				}, "automergeType=branch is not possible because the base branch only accepts changes through its merge queue - falling back to creating a PR. Set automergeType=pr instead, or allow Renovate to bypass the merge queue.");
				return "automerge aborted - merge queue";
			}
			/* v8 ignore if -- TODO: needs test */
			if (err.message.includes("Protected branch")) {
				if (err.message.includes("status check")) {
					logger.debug({ err }, "Branch is not ready for automerge: required status checks are remaining");
					return "not ready";
				}
				if (err.stack?.includes("reviewers")) {
					logger.info({ err }, "Branch automerge is not possible due to branch protection (required reviewers)");
					return "failed";
				}
				logger.info({ err }, "Branch automerge is not possible due to branch protection");
				return "failed";
			}
			logger.warn({ err }, "Unknown error when attempting branch automerge");
			return "failed";
		}
	} else if (branchStatus === "red") return "branch status error";
	else logger.debug(`Branch status is "${branchStatus}" - skipping automerge`);
	return "no automerge";
}
//#endregion
export { tryBranchAutomerge };

//# sourceMappingURL=automerge.js.map