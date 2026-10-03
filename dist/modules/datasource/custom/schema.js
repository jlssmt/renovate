import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/custom/schema.ts
const ReleaseResultZod = z.object({
	releases: z.array(z.object({
		version: z.string(),
		isDeprecated: z.boolean().optional(),
		releaseTimestamp: MaybeTimestamp,
		sourceUrl: z.string().optional(),
		sourceDirectory: z.string().optional(),
		changelogUrl: z.string().optional(),
		digest: z.string().optional(),
		isStable: z.boolean().optional()
	}).transform((input) => {
		return {
			...input,
			newDigest: input.digest,
			digest: void 0
		};
	})),
	tags: z.record(z.string(), z.string()).optional(),
	sourceUrl: z.string().optional(),
	sourceDirectory: z.string().optional(),
	changelogUrl: z.string().optional(),
	homepage: z.string().optional()
});
//#endregion
export { ReleaseResultZod };

//# sourceMappingURL=schema.js.map