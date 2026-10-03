import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/platform/bitbucket/schema.ts
const BitbucketSourceType = z.enum(["commit_directory", "commit_file"]);
const SourceResults = z.object({
	path: z.string(),
	type: BitbucketSourceType,
	commit: z.object({ hash: z.string() })
});
const PagedSourceResults = z.object({
	page: z.number().optional(),
	pagelen: z.number(),
	size: z.number().optional(),
	next: z.string().optional()
}).extend({ values: z.array(SourceResults) });
const RepoInfo = z.object({
	parent: z.unknown().optional().catch(void 0),
	mainbranch: z.object({ name: z.string() }),
	uuid: z.string(),
	full_name: z.string().regex(regEx(/^[^/]+\/[^/]+$/), "Expected repository full_name to be in the format \"owner/repo\""),
	is_private: z.boolean().catch(() => {
		logger.once.warn("Bitbucket: \"is_private\" field missing from repo info");
		return true;
	}),
	project: z.object({ name: z.string() }).nullable().catch(null)
}).transform((repoInfoBody) => {
	const isFork = !!repoInfoBody.parent;
	const [owner, name] = repoInfoBody.full_name.split("/");
	return {
		isFork,
		owner,
		name,
		mainbranch: repoInfoBody.mainbranch.name,
		mergeMethod: "merge",
		uuid: repoInfoBody.uuid,
		is_private: repoInfoBody.is_private,
		projectName: repoInfoBody.project?.name
	};
});
const Repositories = z.object({ values: LooseArray(RepoInfo) }).transform((body) => body.values);
const TaskState = z.union([z.literal("RESOLVED"), z.literal("UNRESOLVED")]);
const PrTask = z.object({
	id: z.number(),
	state: TaskState,
	content: z.object({ raw: z.string() })
});
const UnresolvedPrTasks = z.object({ values: z.array(PrTask) }).transform((data) => data.values.filter((task) => task.state === "UNRESOLVED"));
const WorkspaceAccess = z.object({ workspace: z.object({ slug: z.string() }) });
const WorkspaceAccesses = z.object({ values: z.array(WorkspaceAccess) }).transform((body) => body.values.map(({ workspace }) => workspace.slug));
//#endregion
export { PagedSourceResults, RepoInfo, Repositories, UnresolvedPrTasks, WorkspaceAccesses };

//# sourceMappingURL=schema.js.map