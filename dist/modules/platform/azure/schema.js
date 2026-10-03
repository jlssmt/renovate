import { Json } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/platform/azure/schema.ts
const _WrappedException = z.lazy(() => z.object({
	customProperties: z.record(z.string(), z.any()).optional(),
	errorCode: z.number().optional(),
	eventId: z.number().optional(),
	helpLink: z.string().optional(),
	innerException: _WrappedException.optional(),
	message: z.string().optional(),
	stackTrace: z.string().optional(),
	typeKey: z.string().optional(),
	typeName: z.string().optional()
}));
Json.pipe(_WrappedException);
//#endregion
export {};

//# sourceMappingURL=schema.js.map