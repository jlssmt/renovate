import { regEx } from "../../../util/regex.js";
import { Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/copier/schema.ts
const GitSshUrl = z.string().regex(regEx(/^[^@]+@[^:]*:.+$/), { message: "Invalid Git SSH URL format" });
const CopierAnswersFile = Yaml.pipe(z.object({
	_commit: z.string(),
	_src_path: z.string().url().or(GitSshUrl)
}));
//#endregion
export { CopierAnswersFile };

//# sourceMappingURL=schema.js.map