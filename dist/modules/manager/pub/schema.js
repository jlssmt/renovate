import { LooseRecord, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/pub/schema.ts
const PubspecDependency = LooseRecord(z.string(), z.union([z.string(), z.object({
	version: z.string().optional(),
	path: z.string().optional(),
	git: z.union([z.string().optional(), z.object({
		url: z.string().optional(),
		ref: z.string().optional(),
		path: z.string().optional(),
		tag_pattern: z.string().optional()
	})]),
	hosted: z.union([z.string().optional(), z.object({
		name: z.string().optional(),
		url: z.string().optional()
	})])
})]));
const Pubspec = Yaml.pipe(z.object({
	environment: z.object({
		sdk: z.string(),
		flutter: z.string().optional()
	}),
	dependencies: PubspecDependency.optional(),
	dev_dependencies: PubspecDependency.optional()
}));
const PubspecLock = Yaml.pipe(z.object({ sdks: z.object({
	dart: z.string(),
	flutter: z.string().optional()
}) }));
//#endregion
export { Pubspec, PubspecLock };

//# sourceMappingURL=schema.js.map