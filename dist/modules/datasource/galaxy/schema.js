import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/galaxy/schema.ts
const GalaxyV1 = z.object({ results: z.array(z.object({
	summary_fields: z.object({ versions: z.array(z.object({
		name: z.string(),
		created: MaybeTimestamp
	}).transform(({ name, created }) => ({
		version: name,
		releaseTimestamp: created
	}))) }),
	github_user: z.string().optional(),
	github_repo: z.string().optional()
})) });
//#endregion
export { GalaxyV1 };

//# sourceMappingURL=schema.js.map