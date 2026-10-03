import { logger } from "../../logger/index.js";
import { getCache } from "../cache/repository/index.js";
import { isNonEmptyObject } from "@sindresorhus/is";
//#region lib/util/git/behind-base-branch-cache.ts
function getCachedBehindBaseResult(branchName, branchSha, baseBranch, baseBranchSha) {
	const branch = getCache().branches?.find((branch) => branch.branchName === branchName);
	if (isNonEmptyObject(branch) && branch.sha === branchSha && branch.baseBranch === baseBranch && branch.baseBranchSha === baseBranchSha && branch.isBehindBase !== void 0) return branch.isBehindBase;
	return null;
}
function setCachedBehindBaseResult(branchName, isBehindBase) {
	const branch = getCache().branches?.find((branch) => branch.branchName === branchName);
	if (!branch) {
		logger.debug(`setCachedBehindBaseResult(): Branch cache not present`);
		return;
	}
	branch.isBehindBase = isBehindBase;
}
//#endregion
export { getCachedBehindBaseResult, setCachedBehindBaseResult };

//# sourceMappingURL=behind-base-branch-cache.js.map