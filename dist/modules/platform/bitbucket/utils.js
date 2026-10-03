import { getPrBodyStruct } from "../pr-body.js";
//#region lib/modules/platform/bitbucket/utils.ts
const bitbucketMergeStrategies = /* @__PURE__ */ new Map([
	["squash", "squash"],
	["merge-commit", "merge_commit"],
	["fast-forward", "fast_forward"]
]);
function mergeBodyTransformer(mergeStrategy) {
	const body = { close_source_branch: true };
	if (mergeStrategy && mergeStrategy !== "auto") body.merge_strategy = bitbucketMergeStrategies.get(mergeStrategy);
	return body;
}
const prStates = {
	open: ["OPEN"],
	notOpen: [
		"MERGED",
		"DECLINED",
		"SUPERSEDED"
	],
	merged: ["MERGED"],
	closed: ["DECLINED", "SUPERSEDED"],
	all: [
		"OPEN",
		"MERGED",
		"DECLINED",
		"SUPERSEDED"
	]
};
const buildStates = {
	green: "SUCCESSFUL",
	red: "FAILED",
	yellow: "INPROGRESS"
};
function prInfo(pr) {
	return {
		number: pr.id,
		bodyStruct: getPrBodyStruct(pr.summary?.raw),
		sourceBranch: pr.source?.branch?.name,
		targetBranch: pr.destination?.branch?.name,
		title: pr.title,
		// v8 ignore start -- TODO: add test #40625
		state: prStates.closed?.includes(pr.state) ? "closed" : pr.state?.toLowerCase(),
		// v8 ignore stop
		createdAt: pr.created_on
	};
}
const prFieldsFilter = [
	"values.id",
	"values.title",
	"values.state",
	"values.links.commits.href",
	"values.summary.raw",
	"values.source.branch.name",
	"values.destination.branch.name",
	"values.reviewers.display_name",
	"values.reviewers.uuid",
	"values.reviewers.nickname",
	"values.reviewers.account_status",
	"values.created_on",
	"values.updated_on"
].join(",");
//#endregion
export { buildStates, mergeBodyTransformer, prFieldsFilter, prInfo, prStates };

//# sourceMappingURL=utils.js.map