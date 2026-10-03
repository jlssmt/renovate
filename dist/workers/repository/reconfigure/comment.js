import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { platform } from "../../../modules/platform/index.js";
import { ensureComment } from "../../../modules/platform/comment.js";
import { getDepWarningsOnboardingPR, getErrors, getWarnings } from "../errors-warnings.js";
import { getBaseBranchDesc } from "../onboarding/pr/base-branch.js";
import { getScheduleDesc } from "../onboarding/pr/config-description.js";
import { getPackageFilesDesc, getPackageFilesSummary } from "../onboarding/pr/package-files.js";
import { getExpectedPrList, getExpectedPrListSummary } from "../onboarding/pr/pr-list.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/workers/repository/reconfigure/comment.ts
const SECTION_ORDER = [
	"PACKAGE FILES",
	"CONFIG",
	"BASEBRANCH",
	"PRLIST",
	"WARNINGS",
	"ERRORS"
];
const SUMMARY_SECTION_ORDER = [
	"PRLIST",
	"CONFIG",
	"BASEBRANCH",
	"PACKAGE FILES",
	"WARNINGS",
	"ERRORS"
];
function buildReconfigurePrCommentTemplate(sectionOrder) {
	let prCommentTemplate = `This is a reconfigure PR comment to help you understand and re-configure your Renovate settings. If this Reconfigure PR were to be merged, we'd expect to see the following outcome:\n\n`;
	prCommentTemplate += `
---
${sectionOrder.map((section) => `{{${section}}}`).join("\n")}
`;
	return prCommentTemplate;
}
function fillReconfigurePrCommentBody(prCommentTemplate, sections) {
	let prBody = prCommentTemplate;
	if (sections.packageFiles) prBody = `${prBody.replace("{{PACKAGE FILES}}", sections.packageFiles)}\n`;
	else prBody = prBody.replace("{{PACKAGE FILES}}\n", "");
	prBody = prBody.replace("{{CONFIG}}\n", sections.config);
	prBody = prBody.replace("{{WARNINGS}}\n", sections.warnings);
	prBody = prBody.replace("{{ERRORS}}\n", sections.errors);
	prBody = prBody.replace("{{BASEBRANCH}}\n", sections.baseBranch);
	prBody = prBody.replace("{{PRLIST}}\n", sections.prList);
	return prBody;
}
async function ensureReconfigurePrComment(config, packageFiles, branches, branchName, pr) {
	logger.debug("ensureReconfigurePrComment()");
	logger.trace({ config });
	const packageFilesDesc = getPackageFilesDesc(packageFiles);
	let configDesc = "";
	if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would check branch ${branchName}`);
	else configDesc = getConfigDesc(config);
	const warnings = getWarnings(config) + getDepWarningsOnboardingPR(packageFiles, config);
	const errors = getErrors(config);
	const baseBranchDesc = getBaseBranchDesc(config);
	const prList = getExpectedPrList(config, branches);
	let prBody = fillReconfigurePrCommentBody(buildReconfigurePrCommentTemplate(SECTION_ORDER), {
		packageFiles: packageFilesDesc,
		config: configDesc,
		baseBranch: baseBranchDesc,
		prList,
		warnings,
		errors
	});
	if (prBody.length > platform.maxBodyLength()) {
		logger.debug("Reconfigure PR body exceeds platform limit, switching to summary PR list and package files");
		const prListSummary = getExpectedPrListSummary(config, branches);
		if (packageFilesDesc) {
			const packageFilesSummary = `### Detected Package Files\n\n${getPackageFilesSummary(packageFiles)}`;
			prBody = fillReconfigurePrCommentBody(buildReconfigurePrCommentTemplate(SUMMARY_SECTION_ORDER), {
				packageFiles: packageFilesSummary,
				config: configDesc,
				baseBranch: baseBranchDesc,
				prList: prListSummary,
				warnings,
				errors
			});
		} else prBody = prBody.replace(prList, prListSummary);
	}
	logger.trace(`prBody:\n${prBody}`);
	prBody = platform.massageMarkdown(prBody);
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would ensure comment");
		return true;
	}
	return await ensureComment({
		number: pr.number,
		topic: "Reconfigure PR Results",
		content: prBody
	});
}
function getDescriptionArray(config) {
	logger.debug("getDescriptionArray()");
	logger.trace({ config });
	return (isArray(config.description, isString) ? config.description : []).concat(getScheduleDesc(config));
}
function getConfigDesc(config) {
	logger.debug("getConfigDesc()");
	logger.trace({ config });
	const descriptionArr = getDescriptionArray(config);
	if (!descriptionArr.length) {
		logger.debug("No config description found");
		return "";
	}
	logger.debug(`Found description array with length:${descriptionArr.length}`);
	let desc = `\n### Configuration Summary\n\nBased on the default config's presets, Renovate will:\n\n`;
	descriptionArr.forEach((d) => {
		desc += `  - ${d}\n`;
	});
	desc += "\n\n---\n";
	return desc;
}
//#endregion
export { ensureReconfigurePrComment, getConfigDesc };

//# sourceMappingURL=comment.js.map