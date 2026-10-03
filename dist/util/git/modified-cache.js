import { logger } from "../../logger/index.js";
import { getCache } from "../cache/repository/index.js";
//#region lib/util/git/modified-cache.ts
function getCachedModifiedResult(branchName, branchSha) {
	const branch = getCache().branches?.find((branch) => branch.branchName === branchName);
	if (branch?.sha === branchSha && branch.isModified !== void 0) return branch.isModified;
	return null;
}
function setCachedModifiedResult(branchName, isModified) {
	const branch = getCache().branches?.find((branch) => branch.branchName === branchName);
	if (!branch) {
		logger.debug(`setCachedModifiedResult(): Branch cache not present`);
		return;
	}
	branch.isModified = isModified;
}
//#endregion
export { getCachedModifiedResult, setCachedModifiedResult };

//# sourceMappingURL=modified-cache.js.map