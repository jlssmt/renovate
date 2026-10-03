import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { massageConfig } from "../../../config/massage.js";
import { getBranchCommit } from "../../../util/git/index.js";
import { platform } from "../../../modules/platform/index.js";
import { migrateAndValidate } from "../../../config/migrate-validate.js";
import { ensureComment } from "../../../modules/platform/comment.js";
import { setReconfigureBranchCache } from "./reconfigure-cache.js";
import { getReconfigureBranchName, setBranchStatus } from "./utils.js";
import { isNonEmptyArray, isNonEmptyString } from "@sindresorhus/is";
//#region lib/workers/repository/reconfigure/validate.ts
async function validateReconfigureBranch(config, reconfigureConfig, configFileName, reconfigurePr) {
	logger.debug("validateReconfigureBranch()");
	const context = config.statusCheckNames?.configValidation;
	const branchName = getReconfigureBranchName(config.branchPrefix);
	const branchSha = getBranchCommit(branchName);
	if (context) {
		const validationStatus = await platform.getBranchStatusCheck(branchName, context);
		if (isNonEmptyString(validationStatus)) {
			logger.debug("Skipping validation check because status check already exists.");
			return validationStatus === "green";
		}
	} else logger.debug("Status check is null or an empty string, skipping status check addition.");
	const massagedConfig = massageConfig(reconfigureConfig);
	const res = await migrateAndValidate({}, massagedConfig);
	if (isNonEmptyArray(res.errors)) {
		logger.debug({ errors: res.errors.map((err) => err.message).join(", ") }, "Validation Errors");
		if (reconfigurePr) {
			let body = `There is an error with this repository's Renovate configuration that needs to be fixed.\n\n`;
			body += `Location: \`${configFileName}\`\n`;
			body += `Message: \`${res.errors.map((e) => e.message).join(", ").replace(regEx(/`/g), "'")}\`\n`;
			await ensureComment({
				number: reconfigurePr.number,
				topic: "Action Required: Fix Renovate Configuration",
				content: body
			});
		}
		await setBranchStatus(branchName, "Validation Failed", "red", context);
		setReconfigureBranchCache(branchSha, false);
		return false;
	}
	await setBranchStatus(branchName, "Validation Successful", "green", context);
	return true;
}
//#endregion
export { validateReconfigureBranch };

//# sourceMappingURL=validate.js.map