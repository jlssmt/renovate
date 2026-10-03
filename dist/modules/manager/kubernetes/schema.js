import { LooseArray, multidocYaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/kubernetes/schema.ts
const PodSpecVolumes = z.object({ volumes: LooseArray(z.object({ image: z.object({ reference: z.string() }) })).transform((volumes) => volumes.map((v) => v.image.reference)).catch([]) });
const TemplateSpecVolumes = z.object({ template: z.object({ spec: PodSpecVolumes }) });
const ImageVolumeReferences = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("Pod"),
		spec: PodSpecVolumes.transform((s) => s.volumes)
	}),
	z.object({
		kind: z.enum([
			"DaemonSet",
			"Deployment",
			"Job",
			"ReplicaSet",
			"ReplicationController",
			"StatefulSet"
		]),
		spec: TemplateSpecVolumes.transform((s) => s.template.spec.volumes)
	}),
	z.object({
		kind: z.literal("CronJob"),
		spec: z.object({ jobTemplate: z.object({ spec: TemplateSpecVolumes }) }).transform((s) => s.jobTemplate.spec.template.spec.volumes)
	})
]).transform(({ spec }) => spec).catch([]);
const KubernetesResource = z.object({
	apiVersion: z.string().trim().min(1),
	kind: z.string().trim().min(1),
	metadata: z.object({
		name: z.string(),
		namespace: z.string().optional()
	})
});
const KubernetesManifest = KubernetesResource.extend({ spec: z.unknown().optional() }).transform(({ spec, ...resource }) => ({
	...resource,
	imageVolumeReferences: ImageVolumeReferences.parse({
		kind: resource.kind,
		spec
	})
}));
const KubernetesManifests = multidocYaml({ removeTemplates: true }).pipe(LooseArray(KubernetesManifest));
//#endregion
export { KubernetesManifest, KubernetesManifests, KubernetesResource };

//# sourceMappingURL=schema.js.map