import { Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/crow/schema.ts
const CrowStep = z.object({ image: z.string().optional() });
const CrowStepWithName = CrowStep.extend({ name: z.string() });
const CrowConfig = Yaml.pipe(z.object({
	pipeline: z.union([z.record(z.string(), CrowStep), z.array(CrowStepWithName)]).optional(),
	steps: z.union([z.record(z.string(), CrowStep), z.array(CrowStepWithName)]).optional(),
	clone: z.record(z.string(), CrowStep).optional(),
	services: z.record(z.string(), CrowStep).optional()
}));
//#endregion
export { CrowConfig, CrowStep, CrowStepWithName };

//# sourceMappingURL=schema.js.map