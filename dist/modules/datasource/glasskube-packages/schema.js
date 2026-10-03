import { z } from "zod/v4";
//#region lib/modules/datasource/glasskube-packages/schema.ts
const GlasskubePackageVersions = z.object({
	latestVersion: z.string(),
	versions: z.array(z.object({ version: z.string() }))
});
const GlasskubePackageManifest = z.object({ references: z.optional(z.array(z.object({
	label: z.string(),
	url: z.string()
}))) });
//#endregion
export { GlasskubePackageManifest, GlasskubePackageVersions };

//# sourceMappingURL=schema.js.map