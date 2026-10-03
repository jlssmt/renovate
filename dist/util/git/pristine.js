import { getCache } from "../cache/repository/index.js";
//#region lib/util/git/pristine.ts
function getCachedPristineResult(branchName) {
	return (getCache().branches?.find((branch) => branch.branchName === branchName))?.pristine ?? false;
}
//#endregion
export { getCachedPristineResult };

//# sourceMappingURL=pristine.js.map