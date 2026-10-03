import { z } from "zod/v4";
//#region lib/modules/manager/glasskube/schema.ts
const Package = z.object({
	apiVersion: z.string().startsWith("packages.glasskube.dev/"),
	kind: z.literal("Package").or(z.literal("ClusterPackage")),
	spec: z.object({ packageInfo: z.object({
		name: z.string(),
		version: z.string(),
		repositoryName: z.string().optional()
	}) })
});
const PackageRepository = z.object({
	apiVersion: z.string().startsWith("packages.glasskube.dev/"),
	kind: z.literal("PackageRepository"),
	metadata: z.object({
		name: z.string(),
		annotations: z.record(z.string(), z.string()).optional()
	}),
	spec: z.object({ url: z.string() })
});
const GlasskubeResource = Package.or(PackageRepository);
//#endregion
export { GlasskubeResource, Package, PackageRepository };

//# sourceMappingURL=schema.js.map