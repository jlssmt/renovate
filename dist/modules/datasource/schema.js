import { z } from "zod/v4";
//#region lib/modules/datasource/schema.ts
const ReleasesConfig = z.object({
	packageName: z.string(),
	registryUrl: z.string()
});
const DigestsConfig = z.object({
	packageName: z.string(),
	registryUrl: z.string()
});
//#endregion
export { DigestsConfig, ReleasesConfig };

//# sourceMappingURL=schema.js.map