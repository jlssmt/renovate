import { regEx } from "../../../util/regex.js";
import { LooseArray, LooseRecord } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/terraform-provider/schema.ts
const ProviderAttributes = z.object({ source: z.string().optional() });
const ProviderVersion = z.object({
	type: z.literal("provider-versions"),
	attributes: z.object({
		version: z.string(),
		"published-at": MaybeTimestamp
	})
}).transform((resource) => ({
	version: resource.attributes.version,
	releaseTimestamp: resource.attributes["published-at"]
}));
const TerraformProviderV2Response = z.object({
	data: z.object({ attributes: ProviderAttributes }),
	included: LooseArray(ProviderVersion).catch([])
}).transform((response) => ({
	sourceUrl: response.data.attributes.source,
	releases: response.included
}));
const OpenTofuProviderVersion = z.object({
	id: z.string(),
	published: MaybeTimestamp
}).transform((version) => ({
	version: version.id.replace(regEx(/^v/), ""),
	releaseTimestamp: version.published
}));
const OpenTofuProviderDocsResponse = z.object({ versions: LooseArray(OpenTofuProviderVersion).catch([]) }).transform((response) => ({ releases: response.versions }));
const TerraformBuild = z.object({
	name: z.string(),
	version: z.string(),
	os: z.string(),
	arch: z.string(),
	filename: z.string(),
	url: z.string(),
	shasums_url: z.string().optional()
});
const VersionDetailResponse = z.object({
	name: z.string().optional(),
	version: z.string().optional(),
	builds: z.array(TerraformBuild)
});
const TerraformProviderReleaseBackend = z.object({
	name: z.string().optional(),
	versions: z.record(z.string(), VersionDetailResponse)
});
const TerraformProviderVersionsVersion = z.object({ version: z.string() });
const TerraformProviderVersions = z.object({ versions: LooseArray(TerraformProviderVersionsVersion) });
const TerraformRegistryPlatform = z.object({
	os: z.string(),
	arch: z.string()
});
const TerraformRegistryVersionItem = z.object({
	version: z.string(),
	platforms: LooseArray(TerraformRegistryPlatform)
});
const TerraformRegistryVersions = z.object({ versions: LooseArray(TerraformRegistryVersionItem).optional() });
const TerraformRegistryBuildResponse = z.object({
	os: z.string(),
	arch: z.string(),
	filename: z.string(),
	download_url: z.string(),
	shasums_url: z.string().optional()
});
const OpenTofuProviderPackage = z.object({ hashes: LooseArray(z.string()).catch([]) });
const OpenTofuProviderPackagesResponse = z.object({ packages: LooseRecord(OpenTofuProviderPackage).catch({}) }).transform(({ packages }) => {
	const allHashes = Object.values(packages).flatMap(({ hashes }) => hashes);
	return allHashes.length ? allHashes : null;
});
//#endregion
export { OpenTofuProviderDocsResponse, OpenTofuProviderPackagesResponse, TerraformBuild, TerraformProviderReleaseBackend, TerraformProviderV2Response, TerraformProviderVersions, TerraformRegistryBuildResponse, TerraformRegistryVersions, VersionDetailResponse };

//# sourceMappingURL=schema.js.map