import { z } from "zod/v4";
//#region lib/modules/datasource/buildpacks-registry/schema.ts
/**
*  Response from registry.buildpacks.io
*/
const BuildpacksRegistryResponse = z.object({
	latest: z.object({ homepage: z.string().optional() }).optional(),
	versions: z.object({ version: z.string() }).array()
});
//#endregion
export { BuildpacksRegistryResponse };

//# sourceMappingURL=schema.js.map