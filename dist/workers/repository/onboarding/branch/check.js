import { REPOSITORY_CLOSED_ONBOARDING, REPOSITORY_NO_CONFIG } from "../../../../constants/error-messages.js";
import { getConfigFileNames } from "../../../../config/app-strings.js";
import { logger } from "../../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { getCache } from "../../../../util/cache/repository/index.js";
import { getBranchCommit } from "../../../../util/git/index.js";
import { getElapsedDays } from "../../../../util/date.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { getSemanticCommitPrTitle } from "../common.js";
import { ensureComment } from "../../../../modules/platform/comment.js";
import { isNonEmptyObject } from "@sindresorhus/is";
//#region lib/workers/repository/onboarding/branch/check.ts
async function findFile(fileName) {
	logger.debug(`findFile(${fileName})`);
	return (await scm.getFileList()).includes(fileName);
}
async function configFileExists() {
	for (const fileName of getConfigFileNames()) if (fileName !== "package.json" && await findFile(fileName)) {
		logger.debug(`Config file exists, fileName: ${fileName}`);
		return true;
	}
	return false;
}
async function packageJsonConfigExists() {
	try {
		if (JSON.parse(await readLocalFile("package.json", "utf8")).renovate) return true;
	} catch {}
	return false;
}
async function closedPrExists(config) {
	return await platform.findPr({
		branchName: getInheritedOrGlobal("onboardingBranch"),
		prTitle: getInheritedOrGlobal("onboardingPrTitle"),
		state: "!open",
		targetBranch: config.baseBranch
	}) ?? await platform.findPr({
		branchName: getInheritedOrGlobal("onboardingBranch"),
		prTitle: getSemanticCommitPrTitle(config),
		state: "!open",
		targetBranch: config.baseBranch
	});
}
async function isOnboarded(config) {
	logger.debug("isOnboarded()");
	const title = `Action required: Add a Renovate config`;
	if (config.mode === "silent") {
		logger.debug("Silent mode enabled so repo is considered onboarded");
		return true;
	}
	if (getInheritedOrGlobal("requireConfig") === "optional" && getInheritedOrGlobal("onboarding") === false) return true;
	if (getInheritedOrGlobal("requireConfig") === "ignored") {
		logger.debug("Config file will be ignored");
		return true;
	}
	const closedOnboardingPr = await closedPrExists(config);
	const cache = getCache();
	const onboardingBranchCache = cache?.onboardingBranchCache;
	if (getInheritedOrGlobal("onboarding") && !closedOnboardingPr && isNonEmptyObject(onboardingBranchCache) && onboardingBranchCache.defaultBranchSha === getBranchCommit(config.defaultBranch)) {
		logger.debug("Onboarding cache is valid. Repo is not onboarded");
		return false;
	}
	if (cache.configFileName && !config.forkToken) {
		logger.debug("Checking cached config file name");
		try {
			const configFileContent = await platform.getJsonFile(cache.configFileName);
			if (configFileContent && (cache.configFileName !== "package.json" || configFileContent.renovate)) {
				logger.debug("Existing config file confirmed");
				logger.debug({
					fileName: cache.configFileName,
					config: configFileContent
				}, "Repository config");
				return true;
			}
		} catch {}
		logger.debug("Existing config file no longer exists");
		delete cache.configFileName;
	}
	if (await configFileExists()) {
		await platform.ensureIssueClosing(title);
		return true;
	}
	logger.debug("config file not found");
	if (await packageJsonConfigExists()) {
		logger.debug("package.json contains config");
		await platform.ensureIssueClosing(title);
		return true;
	}
	if (getInheritedOrGlobal("requireConfig") === "required" && getInheritedOrGlobal("onboarding") === false) throw new Error(REPOSITORY_NO_CONFIG);
	if (!closedOnboardingPr) {
		logger.debug("Found no closed onboarding PR");
		return false;
	}
	logger.debug("Found closed onboarding PR");
	if (getInheritedOrGlobal("requireConfig") === "optional") {
		logger.debug("Config not mandatory so repo is considered onboarded");
		return true;
	}
	logger.debug("Repo is not onboarded and no merged PRs exist");
	if (!config.suppressNotifications.includes("onboardingClose")) {
		const ageOfOnboardingPr = getElapsedDays(closedOnboardingPr.createdAt, false);
		const onboardingAutoCloseAge = getInheritedOrGlobal("onboardingAutoCloseAge");
		if (onboardingAutoCloseAge) logger.debug({
			onboardingAutoCloseAge,
			createdAt: closedOnboardingPr.createdAt,
			ageOfOnboardingPr
		}, `Determining that the closed onboarding PR was created at \`${closedOnboardingPr.createdAt}\` was created ${ageOfOnboardingPr.toFixed(2)} days ago`);
		if (!onboardingAutoCloseAge || ageOfOnboardingPr <= onboardingAutoCloseAge) await ensureComment({
			number: closedOnboardingPr.number,
			topic: `Renovate is disabled`,
			content: `Renovate is disabled because there is no Renovate configuration file. To enable Renovate, you can either (a) change this PR's title to get a new onboarding PR, and merge the new onboarding PR, or (b) create a Renovate config file, and commit that file to your base branch.`
		});
	}
	throw new Error(REPOSITORY_CLOSED_ONBOARDING);
}
async function getOnboardingPr(config) {
	return await platform.getBranchPr(getInheritedOrGlobal("onboardingBranch"), config.baseBranch);
}
//#endregion
export { getOnboardingPr, isOnboarded };

//# sourceMappingURL=check.js.map