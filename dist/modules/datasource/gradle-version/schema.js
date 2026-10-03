import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/gradle-version/schema.ts
const GradleRelease = z.object({
	buildTime: z.string().optional(),
	broken: z.boolean().optional(),
	milestoneFor: z.string().optional(),
	nightly: z.boolean().optional(),
	rcFor: z.string().optional(),
	snapshot: z.boolean().optional(),
	version: z.string()
});
const GradleReleases = LooseArray(GradleRelease);
//#endregion
export { GradleRelease, GradleReleases };

//# sourceMappingURL=schema.js.map