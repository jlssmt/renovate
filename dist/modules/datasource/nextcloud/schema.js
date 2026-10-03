import { LooseArray, LooseRecord } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/nextcloud/schema.ts
const Translation = z.object({ changelog: z.string() });
const ApplicationRelease = z.object({
	created: z.string(),
	isNightly: z.boolean(),
	translations: LooseRecord(z.string(), Translation),
	version: z.string()
});
const Application = z.object({
	id: z.string(),
	releases: LooseArray(ApplicationRelease),
	website: z.string()
});
const Applications = z.array(Application);
//#endregion
export { Application, ApplicationRelease, Applications };

//# sourceMappingURL=schema.js.map