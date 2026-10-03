import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/apm/schema.ts
/**
* APM dependencies are declared under `dependencies.apm` / `devDependencies.apm`
* as an array of `[host/]owner/repo[/subpath]#<ref>` strings.
*/
const ApmDependencySection = z.object({ apm: LooseArray(z.string()).catch([]) });
const ApmManifest = z.object({
	dependencies: ApmDependencySection.optional(),
	devDependencies: ApmDependencySection.optional()
});
//#endregion
export { ApmManifest };

//# sourceMappingURL=schema.js.map