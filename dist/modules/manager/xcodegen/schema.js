import { LooseRecord, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/xcodegen/schema.ts
const VersionField = z.union([z.string(), z.number()]).optional().transform((val) => val?.toString());
const XcodeGenSwiftPackage = z.object({
	url: z.string().optional(),
	github: z.string().optional(),
	path: z.string().optional(),
	from: VersionField,
	majorVersion: VersionField,
	minorVersion: VersionField,
	exactVersion: VersionField,
	version: VersionField,
	minVersion: VersionField,
	maxVersion: VersionField,
	branch: z.string().optional(),
	revision: z.string().optional(),
	group: z.string().optional(),
	excludeFromProject: z.boolean().optional()
});
const XcodeGenProjectFile = Yaml.pipe(z.object({ packages: LooseRecord(XcodeGenSwiftPackage).optional() }));
//#endregion
export { XcodeGenProjectFile };

//# sourceMappingURL=schema.js.map