import { LooseArray, LooseRecord, Nullish, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/helmfile/schema.ts
const HelmRepository = z.object({
	name: z.string(),
	url: z.string(),
	oci: z.boolean().optional()
});
const HelmRelease = z.object({
	name: z.string(),
	chart: z.string(),
	version: Nullish(z.string().or(z.number())).transform((version) => version ? version.toString() : null),
	strategicMergePatches: z.unknown().optional(),
	jsonPatches: z.unknown().optional(),
	transformers: z.unknown().optional()
});
const Doc = z.object({
	releases: LooseArray(HelmRelease).optional(),
	templates: LooseRecord(HelmRelease).optional(),
	repositories: LooseArray(HelmRepository).optional()
});
const LockVersion = Yaml.pipe(z.object({ version: z.string() }).transform(({ version }) => version));
//#endregion
export { Doc, HelmRelease, HelmRepository, LockVersion };

//# sourceMappingURL=schema.js.map