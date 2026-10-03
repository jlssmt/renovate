import { regEx } from "../../../../util/regex.js";
import { GithubReleaseAttachmentsDatasource } from "../../../datasource/github-release-attachments/index.js";
import { parseValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/github-release-attachments-dynamic.ts
const sha256Regex = regEx(/^[a-f0-9]{64}$/);
const MiseWith = z.object({
	version: z.string().optional(),
	sha256: z.string().optional()
}).transform(({ version, sha256 }) => [{
	...parseValue(version),
	...sha256 && sha256Regex.test(sha256) ? { currentDigest: sha256 } : {}
}]);
const githubReleaseAttachmentsDynamicActions = { "jdx/mise-action": {
	datasource: GithubReleaseAttachmentsDatasource.id,
	packageName: "jdx/mise",
	withSchema: MiseWith
} };
//#endregion
export { githubReleaseAttachmentsDynamicActions };

//# sourceMappingURL=github-release-attachments-dynamic.js.map