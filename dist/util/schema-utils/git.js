import { regEx } from "../regex.js";
import { z } from "zod/v4";
//#region lib/util/schema-utils/git.ts
const LongCommitSha = z.string().regex(regEx(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/)).brand("LongCommitSha");
function isLongCommitSha(value) {
	return LongCommitSha.safeParse(value).success;
}
function toLongCommitSha(value) {
	if (!isLongCommitSha(value)) throw new Error(`Invalid long commit SHA: ${String(value)}`);
	return value;
}
//#endregion
export { LongCommitSha, isLongCommitSha, toLongCommitSha };

//# sourceMappingURL=git.js.map