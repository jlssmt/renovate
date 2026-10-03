import { Nullish } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/bitbucket-server-tags/schema.ts
const BitbucketServerTag = z.object({
	displayId: z.string(),
	hash: Nullish(z.string())
});
const BitbucketServerTags = z.array(BitbucketServerTag);
const BitbucketServerCommits = z.array(z.object({ id: z.string() }));
//#endregion
export { BitbucketServerCommits, BitbucketServerTag, BitbucketServerTags };

//# sourceMappingURL=schema.js.map