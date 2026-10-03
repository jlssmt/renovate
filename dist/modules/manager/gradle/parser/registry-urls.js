import { regEx } from "../../../../util/regex.js";
import { REGISTRY_URLS, cleanupTempVars, qArtifactId, qGroupId, qValueMatcher, qVersion, storeInTokenMap, storeVarToken } from "./common.js";
import { handleRegistryContent, handleRegistryUrl } from "./handlers.js";
import { qApplyFrom } from "./apply-from.js";
import { qAssignments } from "./assignments.js";
import { qPlugins } from "./plugins.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/registry-urls.ts
function cleanupTmpContentSpec(ctx) {
	ctx.tmpRegistryContent = [];
	return ctx;
}
function qContentDescriptorSpec(methodName, matcher) {
	return query.sym(methodName, storeVarToken).handler((ctx) => storeInTokenMap(ctx, "methodName")).alt(matcher, query.tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		search: query.begin().join(matcher).end()
	}));
}
function qContentDescriptor(mode) {
	return query.alt(qContentDescriptorSpec(regEx(`^(?:${mode}Group|${mode}GroupByRegex|${mode}GroupAndSubgroups)$`), qGroupId), qContentDescriptorSpec(regEx(`^(?:${mode}Module|${mode}ModuleByRegex)$`), query.join(qGroupId, query.op(","), qArtifactId)), qContentDescriptorSpec(regEx(`^(?:${mode}Version|${mode}VersionByRegex)$`), query.join(qGroupId, query.op(","), qArtifactId, query.op(","), qVersion))).handler(handleRegistryContent);
}
const qRegistryContent = query.sym("content").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.alt(qContentDescriptor("include"), qContentDescriptor("exclude"))
});
const qUri = query.alt(query.sym("uri").tree({
	maxDepth: 1,
	search: qValueMatcher
}), qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "registryUrl"));
const qPredefinedRegistries = query.sym(regEx(`^(?:${Object.keys(REGISTRY_URLS).join("|")})$`), (ctx, node) => {
	const nodeTransformed = {
		...node,
		type: "string-value",
		value: REGISTRY_URLS[node.value]
	};
	storeVarToken(ctx, nodeTransformed);
	return ctx;
}).handler((ctx) => storeInTokenMap(ctx, "registryUrl")).alt(query.tree({
	type: "wrapped-tree",
	startsWith: "(",
	endsWith: ")",
	search: query.begin().end()
}).opt(query.op(".").join(qRegistryContent)), query.tree({
	type: "wrapped-tree",
	startsWith: "{",
	endsWith: "}",
	search: query.opt(qRegistryContent)
}));
const qMavenArtifactRegistry = query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.alt(query.sym("name").opt(query.op("=")).join(qValueMatcher).handler((ctx) => storeInTokenMap(ctx, "name")), query.sym("url").opt(query.op("=")).join(qUri), query.sym("setUrl").tree({
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		search: query.begin().join(qUri).end()
	}), qRegistryContent)
});
const qCustomRegistryUrl = query.sym("maven").alt(query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().opt(query.sym("url").op("=")).join(qUri).end()
}).opt(qMavenArtifactRegistry), qMavenArtifactRegistry);
const qForRepository = query.sym("forRepository").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.alt(qPredefinedRegistries, qCustomRegistryUrl)
});
const qFilter = query.sym("filter").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "{",
	endsWith: "}",
	search: qContentDescriptor("include")
});
const qExclusiveContent = query.sym("exclusiveContent", storeVarToken).handler((ctx) => storeInTokenMap(ctx, "registryType")).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "{",
	endsWith: "}",
	search: query.alt(query.join(qForRepository, qFilter), query.join(qFilter, qForRepository))
});
const qRegistries = query.alt(qExclusiveContent, qPredefinedRegistries, qCustomRegistryUrl).handler(handleRegistryUrl).handler(cleanupTmpContentSpec).handler(cleanupTempVars);
const qPluginManagement = query.sym("pluginManagement", storeVarToken).tree({
	type: "wrapped-tree",
	startsWith: "{",
	endsWith: "}",
	preHandler: (ctx) => {
		ctx.tmpTokenStore.registryScope = ctx.varTokens;
		ctx.varTokens = [];
		return ctx;
	},
	search: query.handler((ctx) => {
		// v8 ignore else -- the handler only runs once a registry scope was stored
		if (ctx.tmpTokenStore.registryScope) ctx.tokenMap.registryScope = ctx.tmpTokenStore.registryScope;
		return ctx;
	}).alt(qAssignments, qApplyFrom, qPlugins, qRegistries),
	postHandler: (ctx) => {
		delete ctx.tmpTokenStore.registryScope;
		return ctx;
	}
});
const qRegistryUrls = query.alt(query.sym("publishing").tree(), qPluginManagement, qRegistries);
//#endregion
export { qRegistryUrls };

//# sourceMappingURL=registry-urls.js.map