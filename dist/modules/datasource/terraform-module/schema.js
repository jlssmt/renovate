import { regEx } from "../../../util/regex.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/terraform-module/schema.ts
const ServiceDiscoveryResponse = z.object({
	"modules.v1": z.string().optional(),
	"providers.v1": z.string().optional()
});
const TerraformModuleResponse = z.object({
	source: z.string().optional(),
	versions: z.array(z.string()),
	version: z.string(),
	published_at: MaybeTimestamp
}).transform((resource) => ({
	source: resource.source,
	versions: resource.versions.map((version) => ({
		version,
		...version === resource.version && { releaseTimestamp: resource.published_at }
	}))
}));
const ModuleAttributes = z.object({ source: z.string().optional() });
const ModuleVersion = z.object({
	type: z.literal("module-versions"),
	attributes: z.object({
		version: z.string(),
		"published-at": MaybeTimestamp
	})
}).transform((resource) => ({
	version: resource.attributes.version,
	releaseTimestamp: resource.attributes["published-at"]
}));
const TerraformModuleV2Response = z.object({
	data: z.object({ attributes: ModuleAttributes }),
	included: LooseArray(ModuleVersion).catch([])
}).transform((response) => ({
	sourceUrl: response.data.attributes.source,
	releases: response.included
}));
const OpenTofuModuleVersion = z.object({
	id: z.string(),
	published: MaybeTimestamp
}).transform((version) => ({
	version: version.id.replace(regEx(/^v/), ""),
	releaseTimestamp: version.published
}));
const OpenTofuModuleDocsResponse = z.object({ versions: LooseArray(OpenTofuModuleVersion).catch([]) }).transform((response) => ({ releases: response.versions }));
const TerraformModuleVersion = z.object({ version: z.string() }).transform(({ version }) => ({ version }));
const TerraformModule = z.object({
	versions: LooseArray(TerraformModuleVersion),
	source: z.string().optional()
}).refine(({ versions }) => isNonEmptyArray(versions), "Empty versions array in module response");
const ProtocolModuleResponse = z.object({ modules: LooseArray(TerraformModule) }).refine(({ modules }) => isNonEmptyArray(modules), "Empty response from `/v1/modules` endpoint").transform(({ modules: [module] }) => module);
//#endregion
export { OpenTofuModuleDocsResponse, ProtocolModuleResponse, ServiceDiscoveryResponse, TerraformModule, TerraformModuleResponse, TerraformModuleV2Response, TerraformModuleVersion };

//# sourceMappingURL=schema.js.map