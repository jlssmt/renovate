import { logger } from "../../../logger/index.js";
import { GithubHttp } from "../../../util/http/github.js";
import { getPrBodyStruct } from "../pr-body.js";
import { isNonEmptyArray, isNonEmptyString, isString } from "@sindresorhus/is";
//#region lib/modules/platform/github/common.ts
const githubApi = new GithubHttp();
/**
* @see https://docs.github.com/en/rest/reference/pulls#list-pull-requests
*/
function coerceRestPr(pr) {
	const bodyStruct = pr.bodyStruct ?? getPrBodyStruct(pr.body);
	const result = {
		number: pr.number,
		sourceBranch: pr.head?.ref,
		title: pr.title,
		state: pr.state === "closed" && isString(pr.merged_at) ? "merged" : pr.state,
		bodyStruct,
		updated_at: pr.updated_at,
		node_id: pr.node_id
	};
	if (pr.head?.sha) result.sha = pr.head.sha;
	if (pr.head?.repo?.full_name) result.sourceRepo = pr.head.repo.full_name;
	if (pr.labels) result.labels = pr.labels.map(({ name }) => name);
	if (!!pr.assignee || isNonEmptyArray(pr.assignees)) result.hasAssignees = true;
	if (pr.requested_reviewers) result.reviewers = pr.requested_reviewers.map(({ login }) => login).filter(isNonEmptyString);
	if (pr.created_at) result.createdAt = pr.created_at;
	if (pr.closed_at) result.closedAt = pr.closed_at;
	if (pr.base?.ref) result.targetBranch = pr.base.ref;
	return result;
}
function mapMergeStartegy(strategy) {
	switch (strategy) {
		case "auto": return;
		case "fast-forward":
			logger.warn("Fast-forward merge strategy is not supported by Github. Falling back to merge strategy set for the repository.");
			return;
		case "merge-commit": return "merge";
		default: return strategy;
	}
}
//#endregion
export { coerceRestPr, githubApi, mapMergeStartegy };

//# sourceMappingURL=common.js.map