import { z } from "zod/v4";
//#region lib/modules/datasource/azure-pipelines-tasks/schema.ts
const AzurePipelinesTaskVersion = z.object({
	major: z.number(),
	minor: z.number(),
	patch: z.number()
});
const AzurePipelinesTask = z.object({
	id: z.string(),
	name: z.string(),
	deprecated: z.boolean().optional(),
	releaseNotes: z.string().optional(),
	serverOwned: z.boolean().optional(),
	version: AzurePipelinesTaskVersion.nullable(),
	contributionIdentifier: z.string().optional()
});
const AzurePipelinesJSON = z.object({ value: AzurePipelinesTask.array() });
const AzurePipelinesFallbackTasks = z.record(z.string(), z.string().array());
//#endregion
export { AzurePipelinesFallbackTasks, AzurePipelinesJSON, AzurePipelinesTask, AzurePipelinesTaskVersion };

//# sourceMappingURL=schema.js.map