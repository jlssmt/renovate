import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/node-version/schema.ts
const NodeRelease = z.object({
	/** node version */
	version: z.string(),
	/** release date */
	date: z.string().optional(),
	/** Is LTS release */
	lts: z.union([z.literal(false), z.string()])
});
const NodeReleases = LooseArray(NodeRelease);
//#endregion
export { NodeRelease, NodeReleases };

//# sourceMappingURL=schema.js.map