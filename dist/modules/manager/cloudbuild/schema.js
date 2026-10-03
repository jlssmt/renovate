import { LooseArray, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/cloudbuild/schema.ts
const CloudbuildSteps = Yaml.pipe(z.object({ steps: LooseArray(z.object({ name: z.string() }).transform(({ name }) => name)) }).transform(({ steps }) => steps));
//#endregion
export { CloudbuildSteps };

//# sourceMappingURL=schema.js.map