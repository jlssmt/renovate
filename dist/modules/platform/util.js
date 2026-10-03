import { hash } from "../../util/hash.js";
//#region lib/modules/platform/util.ts
function repoFingerprint(repoId, endpoint) {
	const input = endpoint ? `${endpoint}::${repoId}` : `${repoId}`;
	return hash(input);
}
function getNewBranchName(branchName) {
	if (branchName && !branchName.startsWith("refs/heads/")) return `refs/heads/${branchName}`;
	return branchName;
}
//#endregion
export { getNewBranchName, repoFingerprint };

//# sourceMappingURL=util.js.map