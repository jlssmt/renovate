import { z } from "zod/v4";
//#region lib/modules/manager/fleet/schema.ts
const FleetHelmBlock = z.object({
	chart: z.string().optional(),
	repo: z.string().optional(),
	version: z.string().optional(),
	releaseName: z.string().optional()
});
/**
Represent a GitRepo Kubernetes manifest of Fleet.
@link https://fleet.rancher.io/gitrepo-add/#create-gitrepo-instance
*/
const GitRepo = z.object({
	metadata: z.object({ name: z.string() }),
	kind: z.string(),
	spec: z.object({
		repo: z.string().optional(),
		revision: z.string().optional()
	})
});
/**
Represent a Bundle configuration of Fleet, which is located in `fleet.yaml` files.
@link https://fleet.rancher.io/gitrepo-structure/#fleetyaml
*/
const FleetFile = z.object({
	helm: FleetHelmBlock,
	targetCustomizations: z.array(z.object({
		name: z.string().optional(),
		helm: FleetHelmBlock.partial().optional()
	})).optional()
});
//#endregion
export { FleetFile, GitRepo };

//# sourceMappingURL=schema.js.map