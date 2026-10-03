import { Ini } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/quadlet/schema.ts
const QuadletFile = Ini.pipe(z.object({
	Container: z.object({ Image: z.string() }).optional(),
	Image: z.object({ Image: z.string() }).optional(),
	Volume: z.object({ Image: z.string().optional() }).optional()
}));
//#endregion
export { QuadletFile };

//# sourceMappingURL=schema.js.map