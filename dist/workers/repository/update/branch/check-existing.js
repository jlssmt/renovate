import { REPOSITORY_CHANGED } from "../../../../constants/error-messages.js";
import { logger } from "../../../../logger/index.js";
import { platform } from "../../../../modules/platform/index.js";
//#region lib/workers/repository/update/branch/check-existing.ts
async function prAlreadyExisted(config) {
	logger.trace({ config }, "prAlreadyExisted");
	if (config.recreateClosed) {
		logger.debug("recreateClosed is true. No need to check for closed PR.");
		return null;
	}
	logger.debug("Check for closed PR because recreating closed PRs is disabled.");
	let pr = await platform.findPr({
		branchName: config.branchName,
		prTitle: config.prTitle,
		state: "!open",
		targetBranch: config.baseBranch
	});
	if (!pr && config.branchPrefix !== config.branchPrefixOld) {
		pr = await platform.findPr({
			branchName: config.branchName.replace(config.branchPrefix, config.branchPrefixOld),
			prTitle: config.prTitle,
			state: "!open",
			targetBranch: config.baseBranch
		});
		if (pr) logger.debug("Found closed PR with branchPrefixOld");
	}
	if (pr) {
		logger.debug("Found closed PR with current title");
		// istanbul ignore if
		if ((await platform.getPr(pr.number)).state === "open") {
			logger.debug("PR reopened - aborting run");
			throw new Error(REPOSITORY_CHANGED);
		}
		return pr;
	}
	logger.debug("prAlreadyExisted=false");
	return null;
}
//#endregion
export { prAlreadyExisted };

//# sourceMappingURL=check-existing.js.map