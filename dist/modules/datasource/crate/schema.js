import { DeepNullish } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/crate/schema.ts
const RegistryConfig = z.object({
	dl: z.string(),
	api: z.string().optional()
});
const ReleaseTimestamp = z.object({ version: z.object({ created_at: MaybeTimestamp }) }).transform(({ version: { created_at } }) => created_at).nullable().catch(null);
const CrateMetadata = DeepNullish(z.object({
	description: z.string().optional(),
	documentation: z.string().optional(),
	homepage: z.string().optional(),
	repository: z.string().optional()
}));
const CrateMetadataResponse = z.object({ crate: CrateMetadata });
//#endregion
export { CrateMetadata, CrateMetadataResponse, RegistryConfig, ReleaseTimestamp };

//# sourceMappingURL=schema.js.map