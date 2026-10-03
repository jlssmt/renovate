import { cleanupTempVars, qArtifactId, qGroupId, qStringValue, qStringValueAsSymbol, qValueMatcher, storeInTokenMap, storeVarToken } from "./common.js";
import { handleCatalogDepString, handleCatalogLongFormDep, handlePlugin } from "./handlers.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/version-catalogs.ts
const qAlias = qStringValue.handler((ctx) => storeInTokenMap(ctx, "alias"));
const qVersionCatalogVersion = query.op(".").alt(query.sym("versionRef").tree({
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qStringValueAsSymbol).end()
}), query.sym("version").tree({
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qValueMatcher).end()
})).handler((ctx) => storeInTokenMap(ctx, "version"));
const qVersionCatalogLongFormDependencies = query.sym("library").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qAlias).op(",").join(qGroupId).op(",").join(qArtifactId).end()
}).opt(qVersionCatalogVersion).handler(handleCatalogLongFormDep).handler(cleanupTempVars);
const qVersionCatalogShortDependencies = query.sym("library").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qAlias).op(",").join(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "templateStringTokens")).end()
}).handler(handleCatalogDepString).handler(cleanupTempVars);
const qVersionCatalogPlugins = query.sym("plugin", storeVarToken).handler((ctx) => storeInTokenMap(ctx, "methodName")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qAlias).op(",").alt(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "pluginName")).end()
}).join(qVersionCatalogVersion).handler(handlePlugin).handler(cleanupTempVars);
const qVersionCatalogAliasDependencies = query.sym("alias").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qAlias).end()
}).op(".").sym("to").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qGroupId).op(",").join(qArtifactId).end()
}).opt(qVersionCatalogVersion).handler(handleCatalogLongFormDep).handler(cleanupTempVars);
const qVersionCatalogs = query.alt(qVersionCatalogLongFormDependencies, qVersionCatalogShortDependencies, qVersionCatalogPlugins, qVersionCatalogAliasDependencies);
//#endregion
export { qVersionCatalogs };

//# sourceMappingURL=version-catalogs.js.map