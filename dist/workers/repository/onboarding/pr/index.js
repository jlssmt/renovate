import { REPOSITORY_CLOSED_ONBOARDING } from "../../../../constants/error-messages.js";
import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import { compile } from "../../../../util/template/index.js";
import { toSha256 } from "../../../../util/hash.js";
import { getFile } from "../../../../util/git/index.js";
import { getElapsedDays } from "../../../../util/date.js";
import { emojify } from "../../../../util/emoji.js";
import { hashBody } from "../../../../modules/platform/pr-body.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { isOnboardingBranchConflicted } from "../branch/onboarding-branch-cache.js";
import { OnboardingState, getDefaultConfigFileName, getSemanticCommitPrTitle } from "../common.js";
import { ensureComment } from "../../../../modules/platform/comment.js";
import { getDepWarningsOnboardingPR, getErrors, getWarnings } from "../../errors-warnings.js";
import { prepareLabels } from "../../update/pr/labels.js";
import { addParticipants } from "../../update/pr/participants.js";
import { getPlatformPrOptions } from "../../update/pr/index.js";
import { getBaseBranchDesc } from "./base-branch.js";
import { getConfigDesc } from "./config-description.js";
import { getPackageFilesDesc, getPackageFilesSummary } from "./package-files.js";
import { getExpectedPrList, getExpectedPrListSummary } from "./pr-list.js";
import { isNumber, isString } from "@sindresorhus/is";
//#region lib/workers/repository/onboarding/pr/index.ts
/**
* Given an existing PR, if onboardingAutoCloseAge has passed, close the PR.
*
* Returns true if the PR was closed.
*/
async function ensureOnboardingAutoCloseAge(existingPr) {
	const ageOfOnboardingPr = getElapsedDays(existingPr.createdAt, false);
	const onboardingAutoCloseAge = getInheritedOrGlobal("onboardingAutoCloseAge");
	if (onboardingAutoCloseAge) logger.debug({
		onboardingAutoCloseAge,
		createdAt: existingPr.createdAt,
		ageOfOnboardingPr
	}, `Determining that the onboarding PR created at \`${existingPr.createdAt}\` was created ${ageOfOnboardingPr.toFixed(2)} days ago`);
	if (isNumber(onboardingAutoCloseAge) && ageOfOnboardingPr > onboardingAutoCloseAge) {
		await platform.updatePr({
			number: existingPr.number,
			state: "closed",
			prTitle: existingPr.title
		});
		await ensureComment({
			number: existingPr.number,
			topic: `Renovate is disabled`,
			content: `Renovate is disabled because the onboarding PR has been unmerged for more than ${onboardingAutoCloseAge} days. To enable Renovate, you can either (a) change this PR's title to get a new onboarding PR, and merge the new onboarding PR, or (b) create a Renovate config file, and commit that file to your base branch.`
		});
		logger.debug({
			ageOfOnboardingPr,
			onboardingAutoCloseAge
		}, `Renovate is being disabled for this repository as the onboarding PR has been unmerged for more than ${onboardingAutoCloseAge} days`);
		return true;
	}
	return false;
}
/**
* Full onboarding PRs list package files before the PR list.
*/
const FULL_SECTION_ORDER = [
	"PACKAGE FILES",
	"CONFIG",
	"BASEBRANCH",
	"PRLIST",
	"WARNINGS",
	"ERRORS"
];
/**
* "Summarised" onboarding PRs list PRs before other sections.
*/
const SUMMARY_SECTION_ORDER = [
	"PRLIST",
	"CONFIG",
	"BASEBRANCH",
	"PACKAGE FILES",
	"WARNINGS",
	"ERRORS"
];
function buildOnboardingPrTemplate(config, configFile, rebaseCheckBox, sectionOrder) {
	let prTemplate = `Welcome to [Renovate](${GlobalConfig.get("productLinks").homepage})! This is an onboarding PR to help you understand and configure settings before regular Pull Requests begin.\n\n`;
	prTemplate += getInheritedOrGlobal("requireConfig") === "required" ? emojify(`:vertical_traffic_light: To activate Renovate, merge this Pull Request. To disable Renovate, simply close this Pull Request unmerged.\n\n`) : emojify(`:vertical_traffic_light: Renovate will begin keeping your dependencies up-to-date only once you merge or close this Pull Request.\n\n`);
	prTemplate += emojify(`:books: See our [Reading List](${GlobalConfig.get("productLinks").documentation}reading-list/) for relevant documentation you may be interested in reading.\n\n`);
	prTemplate += emojify(`:abcd: Do you want to change how Renovate upgrades your dependencies?`);
	prTemplate += ` Add your custom config to \`${configFile}\` in this branch${config.onboardingRebaseCheckbox ? " and select the Retry/Rebase checkbox below" : ""}. Renovate will update the Pull Request description the next time it runs.`;
	prTemplate += "\n\n";
	prTemplate += emojify(`

---
${sectionOrder.map((section) => `{{${section}}}`).join("\n")}

---

:question: Got questions? Check out Renovate's [Docs](${GlobalConfig.get("productLinks").documentation}), particularly the Getting Started section.
If you need any further assistance then you can also [request help here](${GlobalConfig.get("productLinks").help}).
`);
	prTemplate += rebaseCheckBox;
	return prTemplate;
}
function fillOnboardingPrBody(prTemplate, sections) {
	let prBody = prTemplate;
	if (sections.packageFiles) prBody = `${prBody.replace("{{PACKAGE FILES}}", sections.packageFiles)}\n`;
	else prBody = prBody.replace("{{PACKAGE FILES}}\n", "");
	prBody = prBody.replace("{{CONFIG}}\n", sections.config);
	prBody = prBody.replace("{{WARNINGS}}\n", sections.warnings);
	prBody = prBody.replace("{{ERRORS}}\n", sections.errors);
	prBody = prBody.replace("{{BASEBRANCH}}\n", sections.baseBranch);
	prBody = prBody.replace("{{PRLIST}}\n", sections.prList);
	return prBody;
}
function finalizeOnboardingPrBody(prBody, config, onboardingConfigHashComment) {
	let finalPrBody = prBody;
	if (isString(config.prHeader)) finalPrBody = `${compile(config.prHeader, config)}\n\n${finalPrBody}`;
	if (isString(config.prFooter)) finalPrBody = `${finalPrBody}\n---\n\n${compile(config.prFooter, config)}\n`;
	return finalPrBody + onboardingConfigHashComment;
}
async function ensureOnboardingPr(config, packageFiles, branches) {
	if (config.onboardingRebaseCheckbox && !OnboardingState.prUpdateRequested) return "onboarding";
	logger.debug("ensureOnboardingPr()");
	logger.trace({ config });
	const onboardingBranch = getInheritedOrGlobal("onboardingBranch");
	const existingPr = await platform.getBranchPr(onboardingBranch, config.defaultBranch);
	if (existingPr) {
		if (await ensureOnboardingAutoCloseAge(existingPr)) throw new Error(REPOSITORY_CLOSED_ONBOARDING);
		if (await isOnboardingBranchConflicted(config.defaultBranch, onboardingBranch)) {
			if (GlobalConfig.get("dryRun")) {
				logger.info("DRY-RUN: Would comment that Onboarding PR is conflicted and needs manual resolving");
				return "onboarding";
			}
			await ensureComment({
				number: existingPr.number,
				topic: "Branch Conflicted",
				content: emojify(`:warning: This PR has a merge conflict which Renovate is unable to automatically resolve, so updates to this PR description are now paused. Please resolve the merge conflict manually.\n\n`)
			});
			return "onboarding";
		}
	}
	if (OnboardingState.onboardingCacheValid) return "onboarding";
	const onboardingConfigHashComment = await getOnboardingConfigHashComment();
	const rebaseCheckBox = getRebaseCheckbox(config.onboardingRebaseCheckbox);
	const configFile = getDefaultConfigFileName();
	logger.debug("Filling in onboarding PR template");
	const packageFilesDesc = getPackageFilesDesc(packageFiles);
	let configDesc = "";
	if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would check branch ${onboardingBranch}`);
	else configDesc = getConfigDesc(config, packageFiles);
	const warnings = getWarnings(config) + getDepWarningsOnboardingPR(packageFiles, config);
	const errors = getErrors(config);
	const baseBranchDesc = getBaseBranchDesc(config);
	const prList = getExpectedPrList(config, branches);
	let prBody = finalizeOnboardingPrBody(fillOnboardingPrBody(buildOnboardingPrTemplate(config, configFile, rebaseCheckBox, FULL_SECTION_ORDER), {
		packageFiles: packageFilesDesc,
		config: configDesc,
		baseBranch: baseBranchDesc,
		prList,
		warnings,
		errors
	}), config, onboardingConfigHashComment);
	if (prBody.length > platform.maxBodyLength()) {
		logger.debug("Onboarding PR body exceeds platform limit, switching to summary PR list and package files");
		const prListSummary = getExpectedPrListSummary(config, branches);
		if (packageFilesDesc) {
			const packageFilesSummary = `### Detected Package Files\n\n${getPackageFilesSummary(packageFiles)}`;
			prBody = finalizeOnboardingPrBody(fillOnboardingPrBody(buildOnboardingPrTemplate(config, configFile, rebaseCheckBox, SUMMARY_SECTION_ORDER), {
				packageFiles: packageFilesSummary,
				config: configDesc,
				baseBranch: baseBranchDesc,
				prList: prListSummary,
				warnings,
				errors
			}), config, onboardingConfigHashComment);
		} else prBody = prBody.replace(prList, prListSummary);
	}
	logger.trace(`prBody:\n${prBody}`);
	prBody = platform.massageMarkdown(prBody, config.rebaseLabel);
	if (existingPr) {
		logger.debug("Found open onboarding PR");
		const prBodyHash = hashBody(prBody);
		if (existingPr.bodyStruct?.hash === prBodyHash) {
			logger.debug(`Pull Request #${existingPr.number} does not need updating`);
			return "onboarding";
		}
		if (GlobalConfig.get("dryRun")) logger.info("DRY-RUN: Would update onboarding PR");
		else {
			await platform.updatePr({
				number: existingPr.number,
				prTitle: existingPr.title,
				prBody
			});
			logger.info({ pr: existingPr.number }, "Onboarding PR updated");
		}
		return "onboarding";
	}
	logger.debug("Creating onboarding PR");
	const labels = prepareLabels(config);
	try {
		if (GlobalConfig.get("dryRun")) logger.info("DRY-RUN: Would create onboarding PR");
		else {
			const prTitle = config.semanticCommits === "enabled" ? getSemanticCommitPrTitle(config) : getInheritedOrGlobal("onboardingPrTitle");
			const pr = await platform.createPr({
				sourceBranch: onboardingBranch,
				targetBranch: config.defaultBranch,
				prTitle,
				prBody,
				labels,
				platformPrOptions: getPlatformPrOptions({
					...config,
					automerge: false
				})
			});
			logger.info({ pr: `Pull Request #${pr.number}` }, "Onboarding PR created");
			await addParticipants(config, pr);
		}
	} catch (err) {
		if (err.response?.statusCode === 422 && err.response?.body?.errors?.[0]?.message?.startsWith("A pull request already exists")) {
			logger.warn("Onboarding PR already exists but cannot find it. It was probably created by a different user.");
			await scm.deleteBranch(onboardingBranch);
			return "onboarding";
		}
		throw err;
	}
	return "onboarding";
}
function getRebaseCheckbox(onboardingRebaseCheckbox) {
	let rebaseCheckBox = "";
	if (onboardingRebaseCheckbox) rebaseCheckBox = `\n\n---\n\n - [ ] <!-- rebase-check -->If you want to rebase/retry this PR, click this checkbox.\n`;
	return rebaseCheckBox;
}
async function getOnboardingConfigHashComment() {
	const configFile = getDefaultConfigFileName();
	const existingContents = await getFile(configFile, getInheritedOrGlobal("onboardingBranch")) ?? "";
	return `\n<!--renovate-config-hash:${toSha256(existingContents)}-->\n`;
}
//#endregion
export { ensureOnboardingPr };

//# sourceMappingURL=index.js.map