import { Json5 } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/renovate-config/schema.ts
const RenovateJson = Json5.pipe(z.object({
	extends: z.array(z.string()).optional(),
	constraints: z.record(z.string(), z.string()).optional(),
	packageRules: z.array(z.object({ constraints: z.record(z.string(), z.string()).optional() })).optional()
}));
//#endregion
export { RenovateJson };

//# sourceMappingURL=schema.js.map