import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { joinUrlParts } from "../../../../util/url.js";
import { platform } from "../../../../modules/platform/index.js";
import { isActiveConfidenceLevel } from "../../../../util/merge-confidence/index.js";
//#region lib/workers/repository/update/branch/status-checks.ts
async function resolveBranchStatus(branchName, internalChecksAsSuccess, ignoreTests = false) {
	logger.debug(`resolveBranchStatus(branchName=${branchName}, ignoreTests=${ignoreTests})`);
	if (ignoreTests) {
		logger.debug("Ignore tests. Return green");
		return "green";
	}
	const status = await platform.getBranchStatus(branchName, internalChecksAsSuccess);
	logger.debug(`Branch status ${status}`);
	return status;
}
async function setStatusCheck({ branchName, context, description, state, url }) {
	if (await platform.getBranchStatusCheck(branchName, context) === state) logger.debug(`Status check ${context} is already up-to-date`);
	else {
		if (GlobalConfig.get("dryRun")) {
			logger.info(`DRY-RUN: Would update ${context} status check state to ${state}`);
			return;
		}
		logger.debug(`Updating ${context} status check state to ${state}`);
		await platform.setBranchStatus({
			branchName,
			context,
			description,
			state,
			url
		});
	}
}
async function setStability(config) {
	const mode = config.statusCheckWhen?.minimumReleaseAge ?? "always";
	if (mode === "never") {
		if (config.stabilityStatus) logger.debug("statusCheckWhen.minimumReleaseAge is set to \"never\", skipping stability status check.");
		return;
	}
	if (!config.stabilityStatus) return;
	if (mode === "failed" && config.stabilityStatus === "green") return;
	const context = config.statusCheckNames?.minimumReleaseAge;
	if (!context) {
		logger.debug("Status check is null or an empty string, skipping status check addition.");
		return;
	}
	const description = config.stabilityStatus === "green" ? "Updates have met minimum release age requirement" : "Updates have not met minimum release age requirement";
	const docsLink = joinUrlParts(GlobalConfig.get("productLinks").documentation, "key-concepts/minimum-release-age/");
	await setStatusCheck({
		branchName: config.branchName,
		context,
		description,
		state: config.stabilityStatus,
		url: docsLink
	});
}
async function setConfidence(config) {
	const mode = config.statusCheckWhen?.mergeConfidence ?? "always";
	if (mode === "never") {
		if (config.branchName && config.confidenceStatus) logger.debug("statusCheckWhen.mergeConfidence is set to \"never\", skipping merge confidence status check.");
		return;
	}
	if (!config.branchName || !config.confidenceStatus || config.minimumConfidence && !isActiveConfidenceLevel(config.minimumConfidence)) return;
	if (mode === "failed" && config.confidenceStatus === "green") return;
	const context = config.statusCheckNames?.mergeConfidence;
	if (!context) {
		logger.debug("Status check is null or an empty string, skipping status check addition.");
		return;
	}
	const description = config.confidenceStatus === "green" ? "Updates have met Merge Confidence requirement" : "Updates have not met Merge Confidence requirement";
	const docsLink = joinUrlParts(GlobalConfig.get("productLinks").documentation, "merge-confidence");
	await setStatusCheck({
		branchName: config.branchName,
		context,
		description,
		state: config.confidenceStatus,
		url: docsLink
	});
}
//#endregion
export { resolveBranchStatus, setConfidence, setStability };

//# sourceMappingURL=status-checks.js.map