import { Jsonc, LooseRecord } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/devcontainer/schema.ts
const DevContainerFile = Jsonc.pipe(z.object({
	image: z.string().optional(),
	features: LooseRecord(z.object({ version: z.string().optional() })).optional()
}));
//#endregion
export { DevContainerFile };

//# sourceMappingURL=schema.js.map