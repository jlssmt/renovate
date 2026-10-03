import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/bitbucket-tags/schema.ts
const BitbucketTag = z.object({
	name: z.string(),
	target: z.object({
		date: z.string().optional(),
		hash: z.string().optional()
	}).optional()
});
const BitbucketTags = z.object({ values: LooseArray(BitbucketTag) }).transform((body) => body.values);
const BitbucketCommit = z.object({
	hash: z.string(),
	date: z.string().optional()
});
const BitbucketCommits = z.object({ values: LooseArray(BitbucketCommit) }).transform((body) => body.values);
//#endregion
export { BitbucketCommits, BitbucketTag, BitbucketTags };

//# sourceMappingURL=schema.js.map