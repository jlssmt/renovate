import { Yaml } from "../../../util/schema-utils/index.js";
import { filterMap } from "../../../util/filter-map.js";
import { parseStep } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bitrise/schema.ts
const BitriseFile = Yaml.pipe(z.object({
	default_step_lib_source: z.string().optional(),
	workflows: z.record(z.string(), z.object({ steps: z.array(z.record(z.string(), z.unknown()).transform((x) => Object.keys(x))).transform((steps) => steps.flat()).optional().default([]) }).transform(({ steps }) => steps)).transform((x) => Object.values(x).flat())
}).transform(({ default_step_lib_source: defaultRegistry, workflows }) => filterMap(workflows, (workflow) => parseStep(workflow, defaultRegistry))));
//#endregion
export { BitriseFile };

//# sourceMappingURL=schema.js.map