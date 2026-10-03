import { regEx } from "../../../../util/regex.js";
import { GRADLE_PLUGINS, GRADLE_TEST_SUITES, cleanupTempVars, qArtifactId, qDotOrBraceExpr, qGroupId, qTemplateString, qValueMatcher, qVersion, storeInTokenMap, storeVarToken } from "./common.js";
import { handleDepString, handleImplicitDep, handleKotlinShortNotationDep, handleLongFormDep } from "./handlers.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/dependencies.ts
const qDependencyStrings = qTemplateString.opt(query.op("+").join(qValueMatcher)).handler((ctx) => storeInTokenMap(ctx, "templateStringTokens")).handler(handleDepString).handler(cleanupTempVars);
const qDependencySet = query.sym("dependencySet", storeVarToken).handler((ctx) => storeInTokenMap(ctx, "methodName")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().sym("group").alt(query.op(":"), query.op("=")).join(qGroupId).op(",").sym("version").alt(query.op(":"), query.op("=")).join(qVersion).end()
}).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.sym("entry").alt(qArtifactId, query.tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		search: query.begin().join(qArtifactId).end()
	})).handler(handleLongFormDep)
}).handler(cleanupTempVars);
const qGroovyMapNotationDependencies = query.sym("group").op(":").join(qGroupId).op(",").sym("name").op(":").join(qArtifactId).op(",").sym("version").op(":").join(qVersion).handler(handleLongFormDep).handler(cleanupTempVars);
const qKotlinShortNotationDependencies = query.sym("kotlin").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qArtifactId).op(",").opt(query.sym("version").op("=")).join(qVersion).end()
}).handler(handleKotlinShortNotationDep).handler(cleanupTempVars);
const qKotlinMapNotationDependencies = query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().sym("group").op("=").join(qGroupId).op(",").sym("name").op("=").join(qArtifactId).op(",").sym("version").op("=").join(qVersion)
}).handler(handleLongFormDep).handler(cleanupTempVars);
const qLongFormDep = query.opt(query.sym(storeVarToken).handler((ctx) => storeInTokenMap(ctx, "methodName"))).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qGroupId).op(",").join(qArtifactId).op(",").join(qVersion).end()
}).handler(handleLongFormDep).handler(cleanupTempVars);
const qImplicitGradlePlugin = query.alt(...Object.keys(GRADLE_PLUGINS).map((implicitDepName) => query.sym(implicitDepName, storeVarToken).handler((ctx) => storeInTokenMap(ctx, "implicitDepName")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.sym(GRADLE_PLUGINS[implicitDepName][0]).alt(query.opt(query.op("=")).join(qVersion), query.op(".").sym(regEx(/^(?:set|value)$/)).tree({
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		search: query.begin().join(qVersion).end()
	}))
}))).handler(handleImplicitDep).handler(cleanupTempVars);
const qTestSuiteMethod = query.sym(regEx(`^(?:${Object.keys(GRADLE_TEST_SUITES).join("|")})$`), storeVarToken).handler((ctx) => storeInTokenMap(ctx, "implicitDepName")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qVersion).end()
});
const qImplicitTestSuites = qDotOrBraceExpr("testing", qDotOrBraceExpr("suites", query.alt(qDotOrBraceExpr("test", qTestSuiteMethod), query.sym("withType").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")"
}).op(".").sym("configureEach").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "{",
	endsWith: "}",
	search: qTestSuiteMethod
})))).handler(handleImplicitDep).handler(cleanupTempVars);
const qIgnoreSubstitutedDependencies = query.sym("substitute").alt(query.sym("module").tree(), query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.sym("module").tree()
}));
const qIgnoreAndroidBuildValues = query.alt(query.sym("buildConfigField").tree(), query.sym("resValue").tree());
const qDependencies = query.alt(qDependencyStrings, qDependencySet, qGroovyMapNotationDependencies, qKotlinShortNotationDependencies, qKotlinMapNotationDependencies, qImplicitGradlePlugin, qImplicitTestSuites, qDotOrBraceExpr("java", query.sym("registerFeature").tree()), qIgnoreSubstitutedDependencies, qIgnoreAndroidBuildValues);
//#endregion
export { qDependencies, qDependencyStrings, qGroovyMapNotationDependencies, qLongFormDep };

//# sourceMappingURL=dependencies.js.map