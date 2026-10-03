import { z } from "zod/v4";
//#region lib/modules/manager/ocb/schema.ts
const Entry = z.object({ gomod: z.string() });
const Module = z.array(Entry).optional();
const OCBConfig = z.object({
	dist: z.object({
		otelcol_version: z.string().optional(),
		module: z.string().optional(),
		version: z.string().optional()
	}),
	extensions: Module,
	exporters: Module,
	receivers: Module,
	processors: Module,
	providers: Module,
	connectors: Module
});
//#endregion
export { OCBConfig };

//# sourceMappingURL=schema.js.map