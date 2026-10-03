import { LooseArray } from "../../../util/schema-utils/index.js";
import { KubernetesResource } from "../kubernetes/schema.js";
import { z } from "zod/v4";
//#region lib/modules/manager/sveltos/schema.ts
const SveltosHelmSource = z.object({
	repositoryURL: z.string(),
	repositoryName: z.string(),
	chartName: z.string(),
	chartVersion: z.string()
});
const SveltosHelmSpec = z.object({ helmCharts: LooseArray(SveltosHelmSource).optional() });
const ClusterProfile = KubernetesResource.extend({
	apiVersion: z.string().startsWith("config.projectsveltos.io/"),
	kind: z.literal("ClusterProfile"),
	spec: SveltosHelmSpec
});
const Profile = KubernetesResource.extend({
	apiVersion: z.string().startsWith("config.projectsveltos.io/"),
	kind: z.literal("Profile"),
	spec: SveltosHelmSpec
});
const EventTrigger = KubernetesResource.extend({
	apiVersion: z.string().startsWith("lib.projectsveltos.io/"),
	kind: z.literal("EventTrigger"),
	spec: SveltosHelmSpec
});
const ClusterPromotionSpec = z.object({ profileSpec: SveltosHelmSpec.optional() });
const ClusterPromotion = KubernetesResource.extend({
	apiVersion: z.string().startsWith("config.projectsveltos.io/"),
	kind: z.literal("ClusterPromotion"),
	spec: ClusterPromotionSpec
});
const ProfileDefinition = z.union([
	Profile,
	ClusterProfile,
	EventTrigger,
	ClusterPromotion
]);
//#endregion
export { ClusterProfile, ClusterPromotion, ClusterPromotionSpec, EventTrigger, Profile, ProfileDefinition, SveltosHelmSource, SveltosHelmSpec };

//# sourceMappingURL=schema.js.map