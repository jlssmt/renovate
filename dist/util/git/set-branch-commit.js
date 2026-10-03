import { logger } from "../../logger/index.js";
import { getCache } from "../cache/repository/index.js";
import { getBranchCommit } from "./index.js";
//#region lib/util/git/set-branch-commit.ts
/**
* Called when a new commit is added to branch
*
* ie. when branch is created/updated
*/
function setBranchNewCommit(branchName, baseBranch, commitSha, commitTimestamp) {
	logger.debug("setBranchCommit()");
	const cache = getCache();
	cache.branches ??= [];
	let branch = cache.branches.find((br) => br.branchName === branchName);
	if (!branch) {
		logger.debug(`setBranchCommit(): Branch cache not present`);
		branch = {
			branchName,
			baseBranch
		};
		cache.branches.push(branch);
	}
	const baseBranchSha = getBranchCommit(baseBranch);
	branch.baseBranchSha = baseBranchSha;
	branch.isBehindBase = false;
	branch.isConflicted = false;
	branch.isModified = false;
	branch.pristine = true;
	branch.sha = commitSha;
	if (commitTimestamp) branch.commitTimestamp = commitTimestamp.toISO();
}
//#endregion
export { setBranchNewCommit };

//# sourceMappingURL=set-branch-commit.js.map