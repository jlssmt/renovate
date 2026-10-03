import { DeepNullish } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/gitlab-releases/schema.ts
const GitlabRelease = DeepNullish(z.object({
	description: z.string().optional().default(""),
	name: z.string().optional().default(""),
	tag_name: z.string(),
	released_at: z.string()
}));
const GitlabReleases = z.array(GitlabRelease);
//#endregion
export { GitlabRelease, GitlabReleases };

//# sourceMappingURL=schema.js.map