import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/jenkins-plugins/schema.ts
const JenkinsPluginInfo = z.object({
	name: z.string(),
	scm: z.string().optional()
});
const JenkinsPluginsInfoResponse = z.object({ plugins: z.record(z.string(), JenkinsPluginInfo).default({}) });
const JenkinsPluginVersion = z.object({
	version: z.string(),
	buildDate: z.string().optional(),
	url: z.string().optional(),
	requiredCore: z.string().optional(),
	releaseTimestamp: MaybeTimestamp.optional()
});
const JenkinsPluginsVersionsResponse = z.object({ plugins: z.record(z.string(), z.record(z.string(), JenkinsPluginVersion)).default({}) });
//#endregion
export { JenkinsPluginInfo, JenkinsPluginVersion, JenkinsPluginsInfoResponse, JenkinsPluginsVersionsResponse };

//# sourceMappingURL=schema.js.map