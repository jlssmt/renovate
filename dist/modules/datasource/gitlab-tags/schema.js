import { z } from "zod/v4";
//#region lib/modules/datasource/gitlab-tags/schema.ts
const GitlabCommit = z.object({
	id: z.string(),
	created_at: z.string()
});
const GitlabCommits = z.array(GitlabCommit);
const GitlabTag = z.object({
	name: z.string(),
	commit: GitlabCommit
});
const GitlabTags = z.array(GitlabTag);
//#endregion
export { GitlabCommit, GitlabCommits, GitlabTag, GitlabTags };

//# sourceMappingURL=schema.js.map