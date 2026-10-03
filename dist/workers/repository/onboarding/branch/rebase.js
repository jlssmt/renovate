import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import { toSha256 } from "../../../../util/hash.js";
import { scm } from "../../../../modules/platform/scm.js";
import { getOnboardingConfigContents } from "./config.js";
import { getDefaultConfigFileName, getSemanticCommitPrTitle } from "../common.js";
import { OnboardingCommitMessageFactory } from "./commit-message.js";
//#region lib/workers/repository/onboarding/branch/rebase.ts
async function rebaseOnboardingBranch(config, previousConfigHash) {
	logger.debug("Checking if onboarding branch needs rebasing");
	const platform = GlobalConfig.get("platform");
	if (![
		"github",
		"gitea",
		"gitlab",
		"forgejo"
	].includes(platform)) {
		logger.debug(`Skipping rebase as ${platform} does not support html comments`);
		return null;
	}
	const configFile = getDefaultConfigFileName();
	const contents = await getOnboardingConfigContents(config, configFile);
	const currentConfigHash = toSha256(contents);
	if (previousConfigHash === currentConfigHash) {
		logger.debug("No rebase needed");
		return null;
	}
	logger.debug({
		previousConfigHash,
		currentConfigHash
	}, "Rebasing onboarding branch");
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would rebase files in onboarding branch");
		return null;
	}
	const commitMessage = new OnboardingCommitMessageFactory(config, configFile).create();
	const prTitle = config.semanticCommits === "enabled" ? getSemanticCommitPrTitle(config) : getInheritedOrGlobal("onboardingPrTitle");
	return scm.commitAndPush({
		baseBranch: config.baseBranch,
		branchName: getInheritedOrGlobal("onboardingBranch"),
		files: [{
			type: "addition",
			path: configFile,
			contents
		}],
		message: commitMessage.toString(),
		platformCommit: config.platformCommit,
		prTitle
	});
}
//#endregion
export { rebaseOnboardingBranch };

//# sourceMappingURL=rebase.js.map