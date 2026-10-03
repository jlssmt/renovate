import { regEx } from "../../../../util/regex.js";
import { cleanupTempVars, qValueMatcher, storeInTokenMap } from "./common.js";
import { handleApplyFrom } from "./handlers.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/apply-from.ts
const qApplyFromFile = query.alt(query.alt(query.opt(query.sym(regEx(/^(?:rootProject|project)$/)).op(".")).sym("file"), query.opt(query.sym("new")).sym("File")).tree({
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().opt(query.join(qValueMatcher, query.op(",")).handler((ctx) => storeInTokenMap(ctx, "parentPath"))).join(qValueMatcher).end()
}), qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "scriptFile"));
const qApplyFrom = query.sym("apply").alt(query.sym("from").op(":").join(qApplyFromFile), query.tree({
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().sym("from").op("=").join(qApplyFromFile).end()
})).handler(handleApplyFrom).handler(cleanupTempVars);
//#endregion
export { qApplyFrom };

//# sourceMappingURL=apply-from.js.map