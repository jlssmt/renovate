import { GlobalConfig } from "../../../../config/global.js";
import { coerceArray } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import { compile } from "../../../../util/template/index.js";
import { filterValidCommitTrailers } from "../../../../util/git/commit-trailers.js";
import { scm } from "../../../../modules/platform/scm.js";
import { getOnboardingConfigContents } from "./config.js";
import { getDefaultConfigFileName, getSemanticCommitPrTitle } from "../common.js";
import { OnboardingCommitMessageFactory } from "./commit-message.js";
//#region lib/workers/repository/onboarding/branch/create.ts
async function createOnboardingBranch(config) {
	logger.debug("createOnboardingBranch()");
	const configFile = getDefaultConfigFileName();
	const contents = await getOnboardingConfigContents(config, configFile);
	logger.debug("Creating onboarding branch");
	let commitMessage = new OnboardingCommitMessageFactory(config, configFile).create().toString();
	if (config.commitBody) {
		commitMessage = `${commitMessage}\n\n${compile(config.commitBody, { gitAuthor: config.gitAuthor })}`;
		logger.trace(`commitMessage: ${commitMessage}`);
	}
	const compiledTrailers = coerceArray(config.commitTrailers).map((trailer) => compile(trailer, { gitAuthor: config.gitAuthor }));
	const trailers = filterValidCommitTrailers(compiledTrailers);
	// istanbul ignore if
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would commit files to onboarding branch");
		return null;
	}
	const prTitle = config.semanticCommits === "enabled" ? getSemanticCommitPrTitle(config) : getInheritedOrGlobal("onboardingPrTitle");
	return scm.commitAndPush({
		baseBranch: config.baseBranch,
		branchName: getInheritedOrGlobal("onboardingBranch"),
		files: [{
			type: "addition",
			path: configFile,
			contents
		}],
		message: commitMessage,
		trailers,
		platformCommit: config.platformCommit,
		force: true,
		prTitle
	});
}
//#endregion
export { createOnboardingBranch };

//# sourceMappingURL=create.js.map