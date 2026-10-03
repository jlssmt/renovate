import { regEx } from "../../../util/regex.js";
import { githubApi } from "./common.js";
import { z } from "zod/v4";
//#region lib/modules/platform/github/branch.ts
const MatchingRef = z.object({ ref: z.string() }).transform(({ ref }) => ref.replace(regEx(/^refs\/heads\//), "")).array();
async function matchingBranches(repo, branchName) {
	const { body: branches } = await githubApi.getJson(`/repos/${repo}/git/matching-refs/heads/${branchName}`, { memCache: false }, MatchingRef);
	return branches;
}
async function remoteBranchExists(repo, branchName) {
	const branches = await matchingBranches(repo, branchName);
	if (branches.some((branch) => branch.startsWith(`${branchName}/`))) {
		const message = `Trying to create a branch '${branchName}' while it's the part of nested branch`;
		throw new Error(message);
	}
	return branches.includes(branchName);
}
//#endregion
export { remoteBranchExists };

//# sourceMappingURL=branch.js.map