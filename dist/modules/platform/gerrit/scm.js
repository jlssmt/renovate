import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { hash } from "../../../util/hash.js";
import { prepareCommit, pushCommit, setVirtualBranch } from "../../../util/git/index.js";
import { DefaultGitScm } from "../default-scm.js";
import { mapBranchStatusToLabel } from "./utils.js";
import { client } from "./client.js";
import { isNonEmptyArray, isString } from "@sindresorhus/is";
import { randomUUID } from "node:crypto";
//#region lib/modules/platform/gerrit/scm.ts
const CODE_REVIEW_LABEL = "Code-Review";
/**
* Gerrit SCM strategy:
* Instead of implementing custom branch operations, we fetch all open Gerrit changes
* as virtual branches (refs/remotes/origin/<branchName>) after repository initialization.
* This allows us to leverage DefaultGitScm for most operations, treating virtual branches
* as regular Git branches, while minimizing Gerrit API requests.
*/
let repository;
let projectLabels = {};
function configureScm(repo, labels = {}) {
	repository = repo;
	projectLabels = labels;
}
/**
* Returns the max vote value for the "Code-Review" label (some Gerrit
* projects only allow up to +1), or `null` if the label isn't defined on
* the project, so the caller can skip voting instead of failing the push.
*/
function getAutoApproveLabelValue() {
	const codeReviewLabel = projectLabels[CODE_REVIEW_LABEL];
	if (!codeReviewLabel) {
		logger.warn({
			repository,
			label: CODE_REVIEW_LABEL
		}, "Cannot auto-approve: label is not defined on the project");
		return null;
	}
	return mapBranchStatusToLabel("green", codeReviewLabel);
}
async function pushForReview(options) {
	const pushOptions = ["notify=NONE", "ready"];
	if (options.autoApprove) {
		const value = getAutoApproveLabelValue();
		if (value !== null) pushOptions.push(`label=${CODE_REVIEW_LABEL}+${value}`);
	}
	if (isNonEmptyArray(options.labels)) for (const label of options.labels) pushOptions.push(`hashtag=${label}`);
	return pushCommit({
		sourceRef: options.sourceRef,
		targetRef: `refs/for/${options.targetBranch}`,
		files: options.files,
		pushOptions
	});
}
var GerritScm = class extends DefaultGitScm {
	async commitAndPush(commit) {
		logger.debug(`commitAndPush(${commit.branchName})`);
		const existingChange = await client.getBranchChange(repository, {
			branchName: commit.branchName,
			state: "open",
			targetBranch: commit.baseBranch,
			requestDetails: ["CURRENT_REVISION"]
		});
		const message = isString(commit.message) ? [commit.message] : commit.message;
		// v8 ignore else -- TODO: add test #40625
		if (commit.prTitle) {
			const firstMessageLines = message[0].split("\n");
			firstMessageLines[0] = commit.prTitle;
			message[0] = firstMessageLines.join("\n");
		}
		const changeId = existingChange?.change_id ?? generateChangeId();
		commit.message = message;
		commit.trailers = [
			...coerceArray(commit.trailers).filter((trailer) => !trailer.startsWith("Renovate-Branch:") && !trailer.startsWith("Change-Id:")),
			`Renovate-Branch: ${commit.branchName}`,
			`Change-Id: ${changeId}`
		];
		const commitResult = await prepareCommit(commit);
		if (commitResult) {
			const { commitSha } = commitResult;
			if (existingChange) {
				/* v8 ignore else -- should never happen */
				if (await pushForReview({
					sourceRef: commit.branchName,
					targetBranch: existingChange.branch,
					files: commit.files,
					autoApprove: commit.autoApprove
				})) {
					const currentRef = existingChange.revisions[existingChange.current_revision].ref;
					await setVirtualBranch(commit.branchName, nextPatchSetRef(currentRef), commitSha);
					return commitSha;
				}
			} else {
				logger.debug(`Commit prepared, push deferred to createPr()`);
				return commitSha;
			}
		}
		return null;
	}
};
/**
* Derive the next patch-set ref from a Gerrit change ref.
* Gerrit refs follow the pattern `refs/changes/<NN>/<change>/<patchset>`.
* After a push, Gerrit creates the next patch-set, so we increment the
* trailing number to keep the virtual branch in sync.
*/
function nextPatchSetRef(currentRef) {
	const lastSlash = currentRef.lastIndexOf("/");
	const patchSet = parseInt(currentRef.slice(lastSlash + 1), 10);
	return `${currentRef.slice(0, lastSlash + 1)}${patchSet + 1}`;
}
/**
* This function should generate a Gerrit Change-ID analogous to the commit hook. We avoid the commit hook cause of security concerns.
* random=$( (whoami ; hostname ; date; cat $1 ; echo $RANDOM) | git hash-object --stdin) prefixed with an 'I'.
* TODO: Gerrit don't accept longer Change-IDs (sha256), but what happens with this https://git-scm.com/docs/hash-function-transition/ ?
*/
function generateChangeId() {
	return `I${hash(randomUUID(), "sha1")}`;
}
//#endregion
export { GerritScm, configureScm, nextPatchSetRef, pushForReview };

//# sourceMappingURL=scm.js.map