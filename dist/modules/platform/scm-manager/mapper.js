import { coerceArray } from "../../../util/array.js";
//#region lib/modules/platform/scm-manager/mapper.ts
const PR_STATE_MAP = {
	DRAFT: "open",
	OPEN: "open",
	REJECTED: "closed",
	MERGED: "merged"
};
function mapPrFromScmToRenovate(pr) {
	return {
		sourceBranch: pr.source,
		targetBranch: pr.target,
		createdAt: pr.creationDate,
		closedAt: pr.closeDate ?? void 0,
		hasAssignees: !!pr.reviewer?.length,
		labels: pr.labels,
		number: parseInt(pr.id, 10),
		reviewers: coerceArray(pr.reviewer?.map((review) => review.displayName)),
		state: PR_STATE_MAP[pr.status],
		title: pr.title,
		isDraft: pr.status === "DRAFT"
	};
}
//#endregion
export { mapPrFromScmToRenovate };

//# sourceMappingURL=mapper.js.map