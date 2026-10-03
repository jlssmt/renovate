import { DeepNullish, LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/conda/schema.ts
const CondaFile = DeepNullish(z.object({
	version: z.string(),
	upload_time: z.string().optional()
}));
const CondaPackage = DeepNullish(z.object({
	html_url: z.string().optional(),
	dev_url: z.string().optional(),
	files: LooseArray(CondaFile).optional(),
	versions: z.array(z.string()).optional()
}));
//#endregion
export { CondaFile, CondaPackage };

//# sourceMappingURL=schema.js.map