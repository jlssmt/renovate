import { DeepNullish, Json } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/swift/schema.ts
const PackageResolvedPin = DeepNullish(z.object({
	identity: z.string(),
	kind: z.string(),
	location: z.string(),
	state: z.object({
		revision: z.string().optional(),
		version: z.string().optional(),
		branch: z.string().optional()
	})
}));
const PackageResolvedJson = Json.pipe(z.object({
	pins: z.array(PackageResolvedPin),
	version: z.number().int().min(2),
	originHash: z.string().optional()
}));
//#endregion
export { PackageResolvedJson };

//# sourceMappingURL=schema.js.map