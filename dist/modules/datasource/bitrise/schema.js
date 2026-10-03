import { Yaml } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/bitrise/schema.ts
const BitriseStepFile = Yaml.pipe(z.object({
	published_at: MaybeTimestamp,
	source_code_url: z.string().optional()
}));
//#endregion
export { BitriseStepFile };

//# sourceMappingURL=schema.js.map