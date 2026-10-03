import { regEx } from "../../../util/regex.js";
import { Json } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/aws-eks-addon/schema.ts
const EksAddonsFilter = Json.pipe(z.object({
	addonName: z.string().nonempty().regex(regEx("^[a-z0-9][a-z0-9-]*[a-z0-9]$")),
	kubernetesVersion: z.string().regex(regEx("^(?<major>\\d+)\\.(?<minor>\\d+)$")).optional(),
	default: z.union([z.boolean(), z.string().transform((value) => value === "true")]).optional(),
	region: z.string().optional(),
	profile: z.string().optional()
}));
//#endregion
export { EksAddonsFilter };

//# sourceMappingURL=schema.js.map