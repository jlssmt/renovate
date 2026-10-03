import { Toml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/mise/schema.ts
const MiseRegistryJson = z.object({
	meta: z.object({ version: z.string() }),
	tools: z.record(z.string(), z.record(z.string(), z.string()))
});
const MiseToolObject = z.object({
	tag_regex: z.string().optional(),
	version_prefix: z.string().optional()
}).extend({ version: z.string().optional() });
/**
* A single tool entry: either a plain version string or an inline table,
* e.g. `"3.11.2"` or `{ version = "3.11.2", virtualenv = ".venv" }`.
*/
const MiseToolValue = z.union([z.string(), MiseToolObject]);
/**
* A tool may also be declared as an array of entries, in which case only
* the first (primary) one is managed. Array items may mix both forms.
*/
const MiseTool = z.union([MiseToolValue, z.array(MiseToolValue)]);
const MiseTask = z.object({ tools: z.record(z.string(), MiseTool).optional() }).passthrough().catch({});
const MiseFile = Toml.pipe(z.object({
	tools: z.record(z.string(), MiseTool).default({}),
	tasks: z.record(z.string(), MiseTask).default({})
}));
const MiseLockTool = z.object({
	version: z.string(),
	backend: z.string().optional(),
	options: z.record(z.string(), z.string()).optional(),
	platforms: z.record(z.string(), z.object({
		checksum: z.string().optional(),
		size: z.number().optional(),
		url: z.string().optional()
	})).optional()
});
const MiseLockFile = Toml.pipe(z.object({ tools: z.record(z.string(), z.array(MiseLockTool)) }));
//#endregion
export { MiseFile, MiseLockFile, MiseRegistryJson };

//# sourceMappingURL=schema.js.map