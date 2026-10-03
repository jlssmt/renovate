import { DeepNullish, LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/repology/schema.ts
const RepologyPackage = DeepNullish(z.object({
	repo: z.string(),
	visiblename: z.string(),
	version: z.string(),
	srcname: z.string().optional(),
	binname: z.string().optional(),
	origversion: z.string().optional()
}));
const RepologyPackages = LooseArray(RepologyPackage).catch([]);
//#endregion
export { RepologyPackage, RepologyPackages };

//# sourceMappingURL=schema.js.map