import { LooseArray, multidocYaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/argocd/schema.ts
const KubernetesResource = z.object({ apiVersion: z.string() });
const ApplicationKustomize = z.object({ images: LooseArray(z.string()).optional() });
const ApplicationSource = z.object({
	chart: z.string().optional(),
	repoURL: z.string(),
	targetRevision: z.string(),
	kustomize: ApplicationKustomize.optional()
});
const ApplicationSpec = z.object({
	source: ApplicationSource.optional(),
	sources: LooseArray(ApplicationSource).optional()
});
const Application = KubernetesResource.extend({
	kind: z.literal("Application"),
	spec: ApplicationSpec
});
const ApplicationSet = KubernetesResource.extend({
	kind: z.literal("ApplicationSet"),
	spec: z.object({ template: z.object({ spec: ApplicationSpec }) })
});
const ApplicationDefinition = Application.or(ApplicationSet);
const ApplicationDefinitions = multidocYaml({ removeTemplates: true }).pipe(LooseArray(ApplicationDefinition));
//#endregion
export { Application, ApplicationDefinition, ApplicationDefinitions, ApplicationKustomize, ApplicationSet, ApplicationSource, ApplicationSpec, KubernetesResource };

//# sourceMappingURL=schema.js.map