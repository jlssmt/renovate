import { regEx } from "../../../../util/regex.js";
import { cleanupTempVars, qStringValue, qValueMatcher, qVersion, storeInTokenMap, storeVarToken } from "./common.js";
import { handlePlugin } from "./handlers.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/plugins.ts
const qPlugins = query.sym(regEx(/^(?:id|kotlin)$/), storeVarToken).handler((ctx) => storeInTokenMap(ctx, "methodName")).alt(qStringValue.handler((ctx) => storeInTokenMap(ctx, "pluginName")).sym("version").join(qVersion), query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qValueMatcher).end()
}).handler((ctx) => storeInTokenMap(ctx, "pluginName")).alt(query.sym("version").join(qVersion), query.opt(query.op(".")).sym("version").tree({
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qVersion).end()
}))).handler(handlePlugin).handler(cleanupTempVars);
//#endregion
export { qPlugins };

//# sourceMappingURL=plugins.js.map