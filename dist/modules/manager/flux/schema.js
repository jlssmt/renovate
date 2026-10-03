import { KubernetesResource } from "../kubernetes/schema.js";
import { z } from "zod/v4";
//#region lib/modules/manager/flux/schema.ts
const HelmRelease = KubernetesResource.extend({
	apiVersion: z.string().startsWith("helm.toolkit.fluxcd.io/"),
	kind: z.literal("HelmRelease"),
	spec: z.object({
		chart: z.object({ spec: z.object({
			chart: z.string(),
			version: z.string().optional(),
			sourceRef: z.object({
				kind: z.string().optional(),
				name: z.string().optional(),
				namespace: z.string().optional()
			}).optional()
		}) }).optional(),
		chartRef: z.object({
			kind: z.string().optional(),
			name: z.string().optional(),
			namespace: z.string().optional()
		}).optional(),
		values: z.record(z.string(), z.unknown()).optional()
	})
});
const HelmRepository = KubernetesResource.extend({
	apiVersion: z.string().startsWith("source.toolkit.fluxcd.io/"),
	kind: z.literal("HelmRepository"),
	spec: z.object({
		url: z.string(),
		type: z.enum(["oci", "default"]).optional()
	})
});
const HelmChart = KubernetesResource.extend({
	apiVersion: z.string().startsWith("source.toolkit.fluxcd.io/"),
	kind: z.literal("HelmChart"),
	spec: z.object({
		chart: z.string(),
		version: z.string().optional(),
		sourceRef: z.object({
			kind: z.string().optional(),
			name: z.string().optional()
		})
	})
});
const GitRepository = KubernetesResource.extend({
	apiVersion: z.string().startsWith("source.toolkit.fluxcd.io/"),
	kind: z.literal("GitRepository"),
	spec: z.object({
		url: z.string(),
		ref: z.object({
			tag: z.string().optional(),
			commit: z.string().optional(),
			branch: z.string().optional()
		}).optional()
	})
});
const OCIRepository = KubernetesResource.extend({
	apiVersion: z.string().startsWith("source.toolkit.fluxcd.io/"),
	kind: z.literal("OCIRepository"),
	spec: z.object({
		url: z.string(),
		ref: z.object({
			tag: z.string().optional(),
			digest: z.string().optional()
		}).optional()
	})
});
const Kustomization = KubernetesResource.extend({
	apiVersion: z.string().startsWith("kustomize.toolkit.fluxcd.io/"),
	kind: z.literal("Kustomization"),
	spec: z.object({ images: z.array(z.object({
		name: z.string(),
		newName: z.string().optional(),
		newTag: z.string().optional(),
		digest: z.string().optional()
	})).optional() })
});
const FluxResource = HelmRelease.or(HelmRepository).or(HelmChart).or(GitRepository).or(OCIRepository).or(Kustomization);
//#endregion
export { FluxResource, GitRepository, HelmChart, HelmRelease, HelmRepository, Kustomization, OCIRepository };

//# sourceMappingURL=schema.js.map