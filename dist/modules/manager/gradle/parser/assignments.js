import { regEx } from "../../../../util/regex.js";
import { cleanupTempVars, coalesceVariable, increaseNestingDepth, prependNestingDepth, qStringValue, qValueMatcher, qVariableAssignmentIdentifier, reduceNestingDepth, storeInTokenMap, storeVarToken } from "./common.js";
import { handleAssignment } from "./handlers.js";
import { qDependencyStrings, qGroovyMapNotationDependencies } from "./dependencies.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/assignments.ts
const qGroovySingleVarAssignment = qVariableAssignmentIdentifier.op("=").handler(coalesceVariable).handler((ctx) => storeInTokenMap(ctx, "keyToken")).join(qStringValue).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment).handler(cleanupTempVars);
const qKotlinSingleVarAssignment = query.sym(regEx(/^(?:set|version)$/)).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qStringValue).handler((ctx) => storeInTokenMap(ctx, "keyToken")).op(",").join(qStringValue).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment).end()
}).handler(cleanupTempVars);
const qKotlinSingleExtraVarAssignment = query.sym("val").sym(storeVarToken).handler((ctx) => storeInTokenMap(ctx, "keyToken")).opt(query.op(":").sym("String")).sym("by").sym("extra").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: query.begin().join(qStringValue).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment).end()
}).handler(cleanupTempVars);
const qGroovySingleMapOfVarAssignment = query.alt(query.begin().join(qGroovyMapNotationDependencies).end(), query.alt(query.sym(storeVarToken), query.str(storeVarToken)).handler(prependNestingDepth).handler(coalesceVariable).handler((ctx) => storeInTokenMap(ctx, "keyToken")).op(":").join(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment), qDependencyStrings);
function qGroovyMapOfExpr(search) {
	return query.alt(query.alt(query.sym(storeVarToken), query.str(storeVarToken)).op(":").tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "[",
		endsWith: "]",
		preHandler: increaseNestingDepth,
		search,
		postHandler: reduceNestingDepth
	}), qGroovySingleMapOfVarAssignment);
}
const qGroovyMultiVarAssignment = qVariableAssignmentIdentifier.alt(query.op("="), query.op("+=")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "[",
	endsWith: "]",
	preHandler: increaseNestingDepth,
	search: qGroovyMapOfExpr(qGroovyMapOfExpr(qGroovySingleMapOfVarAssignment)),
	postHandler: reduceNestingDepth
}).handler(cleanupTempVars);
const qKotlinSingleMapOfVarAssignment = qStringValue.sym("to").handler(prependNestingDepth).handler(coalesceVariable).handler((ctx) => storeInTokenMap(ctx, "keyToken")).join(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "valToken")).handler(handleAssignment);
function qKotlinMapOfExpr(search) {
	return query.alt(qStringValue.sym("to").sym("mapOf").tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		preHandler: increaseNestingDepth,
		search,
		postHandler: reduceNestingDepth
	}), qKotlinSingleMapOfVarAssignment);
}
const qKotlinMultiMapOfVarAssignment = qVariableAssignmentIdentifier.op("=").sym("mapOf").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	preHandler: increaseNestingDepth,
	search: qKotlinMapOfExpr(qKotlinMapOfExpr(qKotlinSingleMapOfVarAssignment)),
	postHandler: reduceNestingDepth
}).handler(cleanupTempVars);
const qAssignments = query.alt(qGroovySingleVarAssignment, qGroovyMultiVarAssignment, qKotlinSingleVarAssignment, qKotlinSingleExtraVarAssignment, qKotlinMultiMapOfVarAssignment);
//#endregion
export { qAssignments, qKotlinMultiMapOfVarAssignment };

//# sourceMappingURL=assignments.js.map