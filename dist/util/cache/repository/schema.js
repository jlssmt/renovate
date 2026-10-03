import { Json } from "../../schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/util/cache/repository/schema.ts
const RepoCacheRecord = Json.pipe(z.object({
	repository: z.string().min(1),
	revision: z.number().refine((v) => v === 13),
	payload: z.string().min(1),
	hash: z.string().min(1),
	fingerprint: z.string().min(1)
}).strict());
//#endregion
export { RepoCacheRecord };

//# sourceMappingURL=schema.js.map