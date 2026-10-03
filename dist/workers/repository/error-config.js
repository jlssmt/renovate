import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { getInheritedOrGlobal } from "../../util/common.js";
import { platform } from "../../modules/platform/index.js";
//#region lib/workers/repository/error-config.ts
function raiseConfigWarningIssue(config, error) {
	logger.debug("raiseConfigWarningIssue()");
	return raiseWarningIssue(config, "configErrorIssue", `Action Required: Fix Renovate Configuration`, `There is an error with this repository's Renovate configuration that needs to be fixed. As a precaution, Renovate will stop PRs until it is resolved.\n\n`, error);
}
function raiseCredentialsWarningIssue(config, error) {
	logger.debug("raiseCredentialsWarningIssue()");
	return raiseWarningIssue(config, "missingCredentialsError", `Action Required: Add missing credentials`, `There are missing credentials for the authentication-required feature. As a precaution, Renovate will pause PRs until it is resolved.\n\n`, error);
}
async function raiseWarningIssue(config, notificationName, title, initialBody, error) {
	if (config.mode === "silent") {
		logger.debug(`Config warning issues are not created, updated or closed when mode=silent`);
		return;
	}
	let body = initialBody;
	if (error.validationSource) body += `Location: \`${error.validationSource}\`\n`;
	if (error.validationError) body += `Error type: ${error.validationError}\n`;
	if (error.validationMessage) body += `Message: ${error.validationMessage}\n`;
	const pr = await platform.getBranchPr(getInheritedOrGlobal("onboardingBranch"), config.baseBranch);
	if (pr?.state === "open") {
		await handleOnboardingPr(pr, body);
		return;
	}
	if (GlobalConfig.get("dryRun")) {
		logger.info({ configError: error }, "DRY-RUN: Would ensure configuration error issue");
		return;
	}
	if (config.suppressNotifications?.includes(notificationName)) {
		logger.info({ notificationName }, "Configuration failure, issues will be suppressed");
		return;
	}
	const res = await platform.ensureIssue({
		title,
		body,
		once: false,
		shouldReOpen: config.configWarningReuseIssue,
		confidential: config.confidential
	});
	if (res === "updated" || res === "created") logger.warn({
		configError: error,
		res
	}, "Configuration Warning");
}
async function handleOnboardingPr(pr, issueMessage) {
	logger.debug("Updating onboarding PR with config error notice");
	if (GlobalConfig.get("dryRun")) {
		logger.info(`DRY-RUN: Would update PR #${pr.number}`);
		return;
	}
	let prBody = `## Action Required: Fix Renovate Configuration\n\n${issueMessage}`;
	prBody += `\n\nOnce you have resolved this problem (in this onboarding branch), Renovate will return to providing you with a preview of your repository's configuration.`;
	try {
		await platform.updatePr({
			number: pr.number,
			prTitle: pr.title,
			prBody
		});
	} catch (err) /* istanbul ignore next */ {
		logger.warn({ err }, "Error updating onboarding PR");
	}
}
//#endregion
export { raiseConfigWarningIssue, raiseCredentialsWarningIssue };

//# sourceMappingURL=error-config.js.map