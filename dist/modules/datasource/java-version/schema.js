import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/java-version/schema.ts
const AdoptiumJavaVersion = z.object({ semver: z.string() });
const AdoptiumJavaResponse = z.object({ versions: LooseArray(AdoptiumJavaVersion).optional() });
const MiseJavaRelease = z.object({
	image_type: z.string(),
	vendor: z.string(),
	version: z.string()
});
z.object({ available_lts_releases: z.array(z.number()) });
//#endregion
export { AdoptiumJavaResponse, AdoptiumJavaVersion, MiseJavaRelease };

//# sourceMappingURL=schema.js.map