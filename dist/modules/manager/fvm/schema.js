import { z } from "zod/v4";
//#region lib/modules/manager/fvm/schema.ts
const FvmConfig = z.object({
	flutterSdkVersion: z.string().optional(),
	flutter: z.string().optional()
});
//#endregion
export { FvmConfig };

//# sourceMappingURL=schema.js.map