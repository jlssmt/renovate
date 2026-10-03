import { logger } from "../../logger/index.js";
import { getCache } from "../cache/repository/index.js";
import { isNonEmptyObject } from "@sindresorhus/is";
//#region lib/util/git/conflicts-cache.ts
function getCachedConflictResult(branchName, branchSha, baseBranch, baseBranchSha) {
	const branch = getCache()?.branches?.find((br) => br.branchName === branchName);
	if (isNonEmptyObject(branch) && branch.baseBranch === baseBranch && branch.baseBranchSha === baseBranchSha && branch.sha === branchSha && branch.isConflicted !== void 0) return branch.isConflicted;
	return null;
}
function setCachedConflictResult(branchName, isConflicted) {
	const branch = getCache()?.branches?.find((br) => br.branchName === branchName);
	if (!branch) {
		logger.debug(`setCachedConflictResult(): Branch cache not present`);
		return;
	}
	branch.isConflicted = isConflicted;
}
//#endregion
export { getCachedConflictResult, setCachedConflictResult };

//# sourceMappingURL=conflicts-cache.js.map