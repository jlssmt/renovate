import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/dart-version/schema.ts
const DartResponse = z.object({
	kind: z.string().optional(),
	prefixes: LooseArray(z.string()).default([])
});
//#endregion
export { DartResponse };

//# sourceMappingURL=schema.js.map