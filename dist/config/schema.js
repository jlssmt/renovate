import { Json } from "../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/config/schema.ts
const DecryptedObject = Json.pipe(z.object({
	o: z.string().optional(),
	r: z.string().optional(),
	v: z.string().optional()
}));
//#endregion
export { DecryptedObject };

//# sourceMappingURL=schema.js.map