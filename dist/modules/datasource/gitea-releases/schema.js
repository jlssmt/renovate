import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/gitea-releases/schema.ts
const Release = z.object({
	name: z.string(),
	tag_name: z.string(),
	body: z.string(),
	prerelease: z.boolean(),
	published_at: MaybeTimestamp
});
const Releases = z.array(Release);
//#endregion
export { Release, Releases };

//# sourceMappingURL=schema.js.map