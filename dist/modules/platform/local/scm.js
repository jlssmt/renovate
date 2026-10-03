import { logger } from "../../../logger/index.js";
import { rawExec } from "../../../util/exec/common.js";
import { glob } from "glob";
//#region lib/modules/platform/local/scm.ts
let fileList;
var LocalFs = class {
	isBranchBehindBase(_branchName, _baseBranch) {
		return Promise.resolve(false);
	}
	isBranchModified(_branchName, _baseBranch) {
		return Promise.resolve(false);
	}
	isBranchConflicted(_baseBranch, _branch) {
		return Promise.resolve(false);
	}
	branchExists(_branchName) {
		return Promise.resolve(true);
	}
	getBranchCommit(_branchName) {
		return Promise.resolve(null);
	}
	getBranchUpdateDate(_branchName) {
		return Promise.resolve(null);
	}
	getAllBranchUpdateDates() {
		return Promise.resolve({});
	}
	deleteBranch(_branchName) {
		return Promise.resolve();
	}
	commitAndPush(_commitConfig) {
		return Promise.resolve(null);
	}
	async getFileList() {
		try {
			const stdout = (await rawExec("git ls-files", { maxBuffer: 10485760 })).stdout;
			logger.debug("Got file list using git");
			fileList = stdout.split("\n");
		} catch {
			logger.debug("Could not get file list using git, using glob instead");
			fileList ??= await glob("**", {
				dot: true,
				nodir: true
			});
		}
		return fileList;
	}
	checkoutBranch(_branchName) {
		return Promise.resolve(null);
	}
	mergeAndPush(_branchName) {
		return Promise.resolve();
	}
	mergeToLocal(_branchName) {
		return Promise.resolve();
	}
};
//#endregion
export { LocalFs };

//# sourceMappingURL=scm.js.map