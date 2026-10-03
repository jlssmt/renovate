import { logger } from "../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../util/common.js";
import { saveCache } from "../../../util/cache/repository/index.js";
import { clearRenovateRefs } from "../../../util/git/index.js";
import { platform } from "../../../modules/platform/index.js";
import { PackageFiles } from "../package-files.js";
import { checkReconfigureBranch } from "../reconfigure/index.js";
import { pruneStaleBranches } from "./prune.js";
import { runBranchSummary, runRenovateRepoStats } from "./repository-statistics.js";
//#region lib/workers/repository/finalize/index.ts
// istanbul ignore next
async function finalizeRepo(config, branchList, repoConfig) {
	await checkReconfigureBranch(config, repoConfig);
	await pruneStaleBranches(config, branchList);
	await saveCache();
	await ensureIssuesClosing();
	await clearRenovateRefs();
	PackageFiles.clear();
	const prList = await platform.getPrList();
	if (prList?.some((pr) => pr.state === "merged" && pr.title !== "Configure Renovate" && pr.title !== getInheritedOrGlobal("onboardingPrTitle") && pr.sourceBranch !== getInheritedOrGlobal("onboardingBranch"))) {
		logger.debug("Repo is activated");
		config.repoIsActivated = true;
	}
	runBranchSummary(config);
	runRenovateRepoStats(config, prList);
}
// istanbul ignore next
function ensureIssuesClosing() {
	return Promise.all([platform.ensureIssueClosing(`Action Required: Fix Renovate Configuration`), platform.ensureIssueClosing(`Action Required: Add missing credentials`)]);
}
//#endregion
export { finalizeRepo };

//# sourceMappingURL=index.js.map