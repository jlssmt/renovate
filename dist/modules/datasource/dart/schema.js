import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/dart/schema.ts
const DartVersionEntry = z.object({
	version: z.string(),
	published: z.string().optional(),
	retracted: z.boolean().optional(),
	pubspec: z.object({ environment: z.object({
		sdk: z.string().optional(),
		flutter: z.string().optional()
	}).optional() }).optional()
});
const DartLatest = z.object({ pubspec: z.object({
	homepage: z.string().optional(),
	repository: z.string().optional()
}).optional() });
const DartResult = z.object({
	versions: LooseArray(DartVersionEntry).optional(),
	latest: DartLatest.optional()
});
//#endregion
export { DartResult };

//# sourceMappingURL=schema.js.map