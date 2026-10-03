import { regEx } from "../../../util/regex.js";
import { z } from "zod/v4";
//#region lib/modules/manager/crossplane/schema.ts
const XPKG = z.object({
	apiVersion: z.string().regex(regEx(/^pkg\.crossplane\.io\//)),
	kind: z.enum([
		"Provider",
		"Configuration",
		"Function"
	]),
	spec: z.object({ package: z.string() })
});
//#endregion
export { XPKG };

//# sourceMappingURL=schema.js.map