import { DeepNullish, EmailAddress } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/platform/scm-manager/schema.ts
const User = z.object({
	mail: EmailAddress,
	displayName: z.string(),
	name: z.string()
});
const DefaultBranch = z.object({ defaultBranch: z.string() });
const Link = DeepNullish(z.object({
	href: z.string(),
	name: z.string().optional(),
	templated: z.boolean().optional()
}));
const Links = z.record(z.string(), z.union([Link, z.array(Link)]));
const PrState = z.enum([
	"DRAFT",
	"OPEN",
	"REJECTED",
	"MERGED"
]);
const PrMergeMethod = z.enum([
	"MERGE_COMMIT",
	"REBASE",
	"FAST_FORWARD_IF_POSSIBLE",
	"FAST_FORWARD_ONLY",
	"SQUASH"
]);
const PullRequest = DeepNullish(z.object({
	id: z.string(),
	author: z.object({
		mail: z.string().optional(),
		displayName: z.string(),
		id: z.string()
	}).optional(),
	reviser: z.object({
		id: z.string().optional(),
		displayName: z.string().optional()
	}).optional(),
	closeDate: z.string().optional(),
	source: z.string(),
	target: z.string(),
	title: z.string(),
	description: z.string().optional(),
	creationDate: z.string(),
	lastModified: z.string().optional(),
	status: PrState,
	reviewer: z.array(z.object({
		id: z.string(),
		displayName: z.string(),
		mail: z.string().optional(),
		approved: z.boolean()
	})).optional(),
	labels: z.string().array(),
	tasks: z.object({
		todo: z.number(),
		done: z.number()
	}),
	_links: Links,
	_embedded: z.object({ defaultConfig: z.object({
		mergeStrategy: PrMergeMethod,
		deleteBranchOnMerge: z.boolean()
	}) })
}));
const RepoType = z.enum([
	"git",
	"svn",
	"hg"
]);
const Repo = DeepNullish(z.object({
	contact: z.string().optional(),
	creationDate: z.string().optional(),
	description: z.string().optional(),
	lastModified: z.string().optional(),
	namespace: z.string(),
	name: z.string(),
	type: RepoType,
	archived: z.boolean(),
	exporting: z.boolean(),
	healthCheckRunning: z.boolean(),
	_links: Links
}));
const Paged = z.object({
	page: z.number(),
	pageTotal: z.number()
});
const PagedPullRequest = Paged.extend({ _embedded: z.object({ pullRequests: z.array(PullRequest) }) });
const PagedRepo = Paged.extend({ _embedded: z.object({ repositories: z.array(Repo) }) });
//#endregion
export { DefaultBranch, Link, Links, PagedPullRequest, PagedRepo, PrMergeMethod, PrState, PullRequest, Repo, User };

//# sourceMappingURL=schema.js.map