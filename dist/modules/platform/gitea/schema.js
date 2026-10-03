import { fromBase64 } from "../../../util/string.js";
import { DeepNullish, EmailAddress, LooseArray } from "../../../util/schema-utils/index.js";
import { LongCommitSha } from "../../../util/schema-utils/git.js";
import { z } from "zod/v4";
//#region lib/modules/platform/gitea/schema.ts
const ContentsCommon = z.object({
	name: z.string(),
	path: z.string()
});
const ContentsFile = ContentsCommon.extend({
	type: z.literal("file"),
	content: z.string().nullable()
}).transform((input) => ({
	...input,
	contentString: input.content ? fromBase64(input.content) : ""
}));
const ContentsDir = ContentsCommon.extend({ type: z.literal("dir") });
const ContentsSymlink = ContentsCommon.extend({ type: z.literal("symlink") });
const ContentsSubmodule = ContentsCommon.extend({ type: z.literal("submodule") });
const RepoContents = z.discriminatedUnion("type", [
	ContentsFile,
	ContentsDir,
	ContentsSymlink,
	ContentsSubmodule
]);
const ContentsListResponse = z.array(RepoContents);
const User = DeepNullish(z.object({
	id: z.number(),
	email: EmailAddress.optional().catch(void 0),
	full_name: z.string().optional(),
	login: z.string()
}));
const RepoPermission = z.object({
	admin: z.boolean(),
	pull: z.boolean(),
	push: z.boolean()
});
const PRMergeMethod = z.enum([
	"fast-forward-only",
	"merge",
	"rebase",
	"rebase-merge",
	"squash"
]);
const Repo = DeepNullish(z.object({
	id: z.number(),
	allow_fast_forward_only_merge: z.boolean().default(false),
	allow_merge_commits: z.boolean().default(false),
	allow_rebase: z.boolean().default(false),
	allow_rebase_explicit: z.boolean().default(false),
	allow_squash_merge: z.boolean().default(false),
	archived: z.boolean().optional(),
	clone_url: z.string().optional(),
	default_merge_style: PRMergeMethod.optional().catch(void 0),
	external_tracker: z.unknown().optional(),
	has_issues: z.boolean().optional().default(false),
	has_pull_requests: z.boolean().optional(),
	ssh_url: z.string().optional(),
	default_branch: z.string(),
	empty: z.boolean().optional(),
	fork: z.boolean().optional(),
	full_name: z.string(),
	mirror: z.boolean().optional(),
	owner: User,
	permissions: RepoPermission
}));
const Label = DeepNullish(z.object({
	id: z.number(),
	name: z.string(),
	description: z.string().optional(),
	color: z.string().optional()
}));
const PRState = z.enum([
	"open",
	"closed",
	"all"
]);
const IssueState = z.enum([
	"open",
	"closed",
	"all"
]);
const PartialRepo = z.object({ full_name: z.string() });
const PR = DeepNullish(z.object({
	number: z.number(),
	state: PRState,
	title: z.string(),
	body: z.string(),
	mergeable: z.boolean(),
	merged: z.boolean().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	closed_at: z.string().optional(),
	diff_url: z.string().optional(),
	base: z.object({ ref: z.string() }).optional(),
	head: z.object({
		label: z.string(),
		sha: LongCommitSha,
		repo: PartialRepo.optional()
	}).optional(),
	assignee: User.optional(),
	assignees: z.array(User).optional(),
	user: User.optional(),
	labels: z.array(Label).optional()
}));
const NullablePR = PR.nullable();
const PRList = LooseArray(NullablePR);
const Issue = DeepNullish(z.object({
	number: z.number(),
	state: IssueState.optional(),
	title: z.string(),
	body: z.string(),
	assignees: z.array(User).optional(),
	labels: z.array(Label).optional()
}));
const Comment = z.object({
	id: z.number(),
	body: z.string()
});
const CommitStatusType = z.enum([
	"pending",
	"success",
	"error",
	"failure",
	"warning",
	"unknown"
]).catch("unknown");
const CommitStatus = DeepNullish(z.object({
	id: z.number(),
	status: CommitStatusType,
	context: z.string(),
	description: z.string().optional(),
	target_url: z.string().optional(),
	created_at: z.string()
}));
const Commit = z.object({ id: z.string() });
z.object({
	name: z.string(),
	commit: Commit
});
const RepoSearchResults = z.object({
	ok: z.boolean(),
	data: z.array(Repo)
});
const Version = z.object({ version: z.string() });
//#endregion
export { Comment, Commit, CommitStatus, CommitStatusType, ContentsListResponse, Issue, IssueState, Label, NullablePR, PR, PRList, PRMergeMethod, PRState, Repo, RepoContents, RepoPermission, RepoSearchResults, User, Version };

//# sourceMappingURL=schema.js.map