import { Toml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/gleam/schema.ts
const GleamToml = Toml.pipe(z.object({
	name: z.string(),
	dependencies: z.record(z.string(), z.string()).optional(),
	["dev-dependencies"]: z.record(z.string(), z.string()).optional()
}));
const Package = z.object({
	name: z.string(),
	version: z.string(),
	requirements: z.array(z.string()).optional()
});
const ManifestToml = Toml.pipe(z.object({ packages: z.array(Package).optional() }));
//#endregion
export { GleamToml, ManifestToml };

//# sourceMappingURL=schema.js.map