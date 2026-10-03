import { logger } from "../../../logger/index.js";
import { DeepNullish, Json, LooseArray, Nullish } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/docker/schema.ts
/**
*  OCI manifest object
*/
const ManifestObject = z.object({
	schemaVersion: z.literal(2),
	mediaType: Nullish(z.string())
});
/**
* Oci descriptor
* https://github.com/opencontainers/image-spec/blob/main/descriptor.md
*/
const Descriptor = z.object({
	mediaType: z.string(),
	digest: z.string(),
	size: Nullish(z.number().int().gte(0)),
	annotations: Nullish(z.record(z.string(), z.string()))
});
/**
* OCI platform properties
* https://github.com/opencontainers/image-spec/blob/main/image-index.md
*/
const OciPlatform = Nullish(DeepNullish(z.object({ architecture: z.string().optional() })));
/**
* OCI Image Configuration.
*
* Compatible with old docker configiguration.
* https://github.com/opencontainers/image-spec/blob/main/config.md
*/
const OciImageConfig = DeepNullish(z.object({
	architecture: z.string().optional(),
	config: z.object({ Labels: z.record(z.string(), z.string()).optional() }).optional()
}));
/**
* OCI Helm Configuration
* https://helm.sh/docs/topics/charts/#the-chartyaml-file
*/
const OciHelmConfig = DeepNullish(z.object({
	name: z.string(),
	version: z.string(),
	home: z.string().optional(),
	sources: z.array(z.string()).optional()
}));
/**
* OCI Image Manifest
* The same structure as docker image manifest, but mediaType is not required and is not present in the wild.
* https://github.com/opencontainers/image-spec/blob/main/manifest.md
*/
const OciImageManifest = ManifestObject.extend({
	mediaType: z.literal("application/vnd.oci.image.manifest.v1+json"),
	config: Descriptor.extend({ mediaType: z.enum([
		"application/vnd.oci.image.config.v1+json",
		"application/vnd.cncf.helm.config.v1+json",
		"application/vnd.devcontainers",
		"application/vnd.oci.empty.v1+json",
		"application/vnd.cncf.flux.config.v1+json"
	]) }),
	annotations: Nullish(z.record(z.string(), z.string()))
});
/**
* OCI Image List
* mediaType is not required.
* https://github.com/opencontainers/image-spec/blob/main/image-index.md
*/
const OciImageIndexManifest = ManifestObject.extend({
	mediaType: z.literal("application/vnd.oci.image.index.v1+json"),
	manifests: LooseArray(Descriptor.extend({
		mediaType: z.enum(["application/vnd.oci.image.manifest.v1+json", "application/vnd.oci.image.index.v1+json"]),
		platform: OciPlatform
	})),
	annotations: Nullish(z.record(z.string(), z.string()))
});
/**
* Image Manifest
* https://docs.docker.com/registry/spec/manifest-v2-2/#image-manifest
*/
const DistributionManifest = ManifestObject.extend({
	mediaType: z.literal("application/vnd.docker.distribution.manifest.v2+json"),
	config: Descriptor.extend({ mediaType: z.literal("application/vnd.docker.container.image.v1+json") })
});
/**
* Manifest List
* https://docs.docker.com/registry/spec/manifest-v2-2/#manifest-list
*/
const DistributionListManifest = ManifestObject.extend({
	mediaType: z.literal("application/vnd.docker.distribution.manifest.list.v2+json"),
	manifests: z.array(Descriptor.extend({
		mediaType: z.literal("application/vnd.docker.distribution.manifest.v2+json"),
		platform: OciPlatform
	}))
});
const Manifest = ManifestObject.passthrough().transform((value, ctx) => {
	if (value.mediaType === void 0) {
		if ("config" in value) value.mediaType = "application/vnd.oci.image.manifest.v1+json";
		else if ("manifests" in value) value.mediaType = "application/vnd.oci.image.index.v1+json";
		else {
			ctx.addIssue({
				code: "custom",
				message: "Invalid manifest, missing mediaType."
			});
			return z.NEVER;
		}
	}
	return value;
}).pipe(z.discriminatedUnion("mediaType", [
	DistributionManifest,
	DistributionListManifest,
	OciImageManifest,
	OciImageIndexManifest
]));
const ManifestJson = Json.pipe(Manifest);
const DockerHubTagImage = z.object({
	architecture: z.string().nullable().catch(null),
	digest: z.string().nullable().catch(null)
});
const DockerHubTag = z.object({
	id: z.number(),
	last_updated: z.string().datetime(),
	name: z.string(),
	tag_last_pushed: z.string().datetime().nullable().catch(null),
	digest: z.string().nullable().catch(null),
	images: z.array(DockerHubTagImage).catch([])
});
const DockerHubTagsPage = z.object({
	count: z.number(),
	next: z.string().nullable().catch(null),
	results: LooseArray(DockerHubTag, { 
	/* v8 ignore next -- TODO: add test */
onError: ({ error }) => {
		logger.debug({ err: error }, "Docker: Failed to parse some tags from Docker Hub");
	} })
});
/**
* Docker registry auth token response.
* https://distribution.github.io/distribution/spec/auth/token/
*/
const RegistryAuthToken = z.object({
	token: z.string().optional(),
	access_token: z.string().optional()
});
/**
* Docker registry tags list response.
* https://distribution.github.io/distribution/spec/api/#listing-image-tags
*/
const RegistryTagsList = z.object({ tags: z.array(z.string()) });
/**
* Quay registry tags list response (Quay v1 API).
*/
const QuayTagsResponse = z.object({
	tags: LooseArray(z.object({ name: z.string() })),
	has_additional: z.boolean().default(false)
});
//#endregion
export { Descriptor, DistributionListManifest, DistributionManifest, DockerHubTag, DockerHubTagImage, DockerHubTagsPage, Manifest, ManifestJson, ManifestObject, OciHelmConfig, OciImageConfig, OciImageIndexManifest, OciImageManifest, QuayTagsResponse, RegistryAuthToken, RegistryTagsList };

//# sourceMappingURL=schema.js.map