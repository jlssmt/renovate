import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/nuget/schema.ts
const ServicesIndexRaw = z.object({ resources: LooseArray(z.object({
	"@id": z.string(),
	"@type": z.string()
})).catch([]) });
const Deprecation = z.object({ reasons: z.array(z.string()) });
const CatalogEntry = z.object({
	version: z.string(),
	published: z.string().optional(),
	projectUrl: z.string().optional(),
	listed: z.boolean().optional(),
	packageContent: z.string().optional(),
	deprecation: Deprecation.optional()
});
const CatalogItem = z.object({ catalogEntry: CatalogEntry });
const CatalogPage = z.object({
	"@id": z.string().optional(),
	items: LooseArray(CatalogItem).optional()
});
const PackageRegistration = z.object({ items: LooseArray(CatalogPage).default([]) });
//#endregion
export { CatalogEntry, CatalogPage, PackageRegistration, ServicesIndexRaw };

//# sourceMappingURL=schema.js.map