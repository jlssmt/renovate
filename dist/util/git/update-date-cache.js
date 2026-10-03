import { logger } from "../../logger/index.js";
import { getCache } from "../cache/repository/index.js";
import { DateTime } from "luxon";
//#region lib/util/git/update-date-cache.ts
function getCachedUpdateDateResult(branchName, branchSha) {
	if (!branchSha) return null;
	const branch = getCache().branches?.find((br) => br.branchName === branchName);
	if (branch?.sha === branchSha && branch.commitTimestamp !== void 0) return DateTime.fromISO(branch.commitTimestamp);
	return null;
}
function setCachedUpdateDateResult(branchName, updateDate) {
	const branch = getCache().branches?.find((br) => br.branchName === branchName);
	if (!branch) {
		logger.debug(`setCachedUpdateDateResult(): Branch cache not present`);
		return;
	}
	branch.commitTimestamp = updateDate.toISO();
}
//#endregion
export { getCachedUpdateDateResult, setCachedUpdateDateResult };

//# sourceMappingURL=update-date-cache.js.map