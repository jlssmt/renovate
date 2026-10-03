import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/gitea-tags/schema.ts
const Commit = z.object({ sha: z.string() });
const Commits = z.array(Commit);
const TagCommit = z.object({
	sha: z.string(),
	created: MaybeTimestamp
});
const Tag = z.object({
	name: z.string(),
	commit: TagCommit
});
const Tags = z.array(Tag);
//#endregion
export { Commit, Commits, Tag, Tags };

//# sourceMappingURL=schema.js.map