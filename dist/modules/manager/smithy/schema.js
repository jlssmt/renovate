import { Jsonc, LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/smithy/schema.ts
const SmithyBuild = Jsonc.pipe(z.object({ maven: z.object({
	dependencies: LooseArray(z.string()).optional(),
	repositories: LooseArray(z.object({ url: z.string() })).optional()
}).optional() }));
//#endregion
export { SmithyBuild };

//# sourceMappingURL=schema.js.map