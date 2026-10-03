import { branchExists, checkoutBranch, commitFiles, deleteBranch, getAllBranchUpdateDates, getBranchCommit, getBranchUpdateDate, getFileList, isBranchBehindBase, isBranchConflicted, isBranchModified, mergeBranch, mergeToLocal, syncForkWithUpstream } from "../../util/git/index.js";
//#region lib/modules/platform/default-scm.ts
var DefaultGitScm = class {
	branchExists(branchName) {
		return Promise.resolve(branchExists(branchName));
	}
	commitAndPush(commitConfig) {
		return commitFiles(commitConfig);
	}
	deleteBranch(branchName) {
		return deleteBranch(branchName);
	}
	getBranchCommit(branchName) {
		return Promise.resolve(getBranchCommit(branchName));
	}
	getBranchUpdateDate(branchName) {
		return getBranchUpdateDate(branchName);
	}
	getAllBranchUpdateDates() {
		return getAllBranchUpdateDates();
	}
	isBranchBehindBase(branchName, baseBranch) {
		return isBranchBehindBase(branchName, baseBranch);
	}
	isBranchConflicted(baseBranch, branch) {
		return isBranchConflicted(baseBranch, branch);
	}
	isBranchModified(branchName, baseBranch) {
		return isBranchModified(branchName, baseBranch);
	}
	getFileList() {
		return getFileList();
	}
	checkoutBranch(branchName) {
		return checkoutBranch(branchName);
	}
	mergeAndPush(branchName) {
		return mergeBranch(branchName);
	}
	mergeToLocal(branchName) {
		return mergeToLocal(branchName);
	}
	syncForkWithUpstream(branchName) {
		return syncForkWithUpstream(branchName);
	}
};
//#endregion
export { DefaultGitScm };

//# sourceMappingURL=default-scm.js.map