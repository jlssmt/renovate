import { commitFiles } from "../../../util/git/index.js";
import { DefaultGitScm } from "../default-scm.js";
import { assertPrNotInMergeQueue, commitFiles as commitFiles$1, isGHApp } from "./index.js";
//#region lib/modules/platform/github/scm.ts
var GithubScm = class extends DefaultGitScm {
	async commitAndPush(commitConfig) {
		let platformCommit = commitConfig.platformCommit;
		if (platformCommit === "auto" && isGHApp()) platformCommit = "enabled";
		await assertPrNotInMergeQueue(commitConfig.branchName, commitConfig.baseBranch);
		return platformCommit === "enabled" ? commitFiles$1(commitConfig) : commitFiles(commitConfig);
	}
};
//#endregion
export { GithubScm };

//# sourceMappingURL=scm.js.map