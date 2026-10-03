import { cleanupTempVars, coalesceVariable, increaseNestingDepth, prependNestingDepth, qValueMatcher, qVariableAssignmentIdentifier, reduceNestingDepth, storeInTokenMap, storeVarToken } from "./common.js";
import { handleAssignment } from "./handlers.js";
import { qDependencyStrings } from "./dependencies.js";
import { qKotlinMultiMapOfVarAssignment } from "./assignments.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/objects.ts
const qKotlinListOfAssignment = query.sym("listOf").tree({
	type: "wrapped-tree",
	startsWith: "(",
	endsWith: ")",
	search: qDependencyStrings
});
const qKotlinConstValAssignment = query.sym("const").sym("val").sym(storeVarToken).handler(prependNestingDepth).handler(coalesceVariable).handler((ctx) => storeInTokenMap(ctx, "keyToken")).op("=").join(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment).handler(cleanupTempVars);
const qKotlinSingleObjectVarAssignment = query.alt(qKotlinConstValAssignment, qKotlinMultiMapOfVarAssignment, qVariableAssignmentIdentifier.opt(query.op(":").sym("String")).op("=").handler(prependNestingDepth).handler(coalesceVariable).handler((ctx) => storeInTokenMap(ctx, "keyToken")).alt(qKotlinListOfAssignment, qValueMatcher.handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment)).handler(cleanupTempVars));
function qKotlinMultiObjectExpr(search) {
	return query.alt(query.sym("object").sym(storeVarToken).tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "{",
		endsWith: "}",
		preHandler: increaseNestingDepth,
		search,
		postHandler: reduceNestingDepth
	}), qKotlinSingleObjectVarAssignment);
}
const qKotlinMultiObjectVarAssignment = qKotlinMultiObjectExpr(qKotlinMultiObjectExpr(qKotlinMultiObjectExpr(qKotlinMultiObjectExpr(qKotlinSingleObjectVarAssignment)))).handler(cleanupTempVars);
//#endregion
export { qKotlinMultiObjectVarAssignment };

//# sourceMappingURL=objects.js.map