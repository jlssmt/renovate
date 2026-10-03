import { regEx } from "../../../../util/regex.js";
import { clone } from "../../../../util/clone.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/common.ts
const REGISTRY_URLS = {
	google: "https://dl.google.com/android/maven2/",
	gradlePluginPortal: "https://plugins.gradle.org/m2/",
	jcenter: "https://jcenter.bintray.com/",
	mavenCentral: "https://repo.maven.apache.org/maven2"
};
const GRADLE_PLUGINS = {
	checkstyle: ["toolVersion", "com.puppycrawl.tools:checkstyle"],
	codenarc: ["toolVersion", "org.codenarc:CodeNarc"],
	composeOptions: ["kotlinCompilerExtensionVersion", "androidx.compose.compiler:compiler"],
	detekt: ["toolVersion", "io.gitlab.arturbosch.detekt:detekt-core"],
	findbugs: ["toolVersion", "com.google.code.findbugs:findbugs"],
	googleJavaFormat: ["toolVersion", "com.google.googlejavaformat:google-java-format"],
	jacoco: ["toolVersion", "org.jacoco:jacoco"],
	jmh: ["jmhVersion", "org.openjdk.jmh:jmh-core"],
	lombok: ["version", "org.projectlombok:lombok"],
	micronaut: ["version", "io.micronaut.platform:micronaut-platform"],
	pmd: ["toolVersion", "net.sourceforge.pmd:pmd-java"],
	spotbugs: ["toolVersion", "com.github.spotbugs:spotbugs"]
};
const GRADLE_TEST_SUITES = {
	useJunit: "junit:junit",
	useJUnitJupiter: "org.junit.jupiter:junit-jupiter",
	useKotlinTest: "org.jetbrains.kotlin:kotlin-test-junit",
	useSpock: "org.spockframework:spock-core",
	useTestNG: "org.testng:testng"
};
function storeVarToken(ctx, node) {
	ctx.varTokens.push(node);
	return ctx;
}
function increaseNestingDepth(ctx) {
	ctx.tmpNestingDepth.push(...ctx.varTokens);
	ctx.varTokens = [];
	return ctx;
}
function reduceNestingDepth(ctx) {
	ctx.tmpNestingDepth.pop();
	return ctx;
}
function prependNestingDepth(ctx) {
	ctx.varTokens = [...clone(ctx.tmpNestingDepth), ...ctx.varTokens];
	return ctx;
}
function storeInTokenMap(ctx, tokenMapKey) {
	ctx.tokenMap[tokenMapKey] = ctx.varTokens;
	ctx.varTokens = [];
	return ctx;
}
function loadFromTokenMap(ctx, tokenMapKey) {
	const tokens = ctx.tokenMap[tokenMapKey];
	if (!tokens) throw new Error(`Expected token ${tokenMapKey} not found`);
	return tokens;
}
function cleanupTempVars(ctx) {
	ctx.tokenMap = {};
	ctx.varTokens = [];
	return ctx;
}
function stripReservedPrefixFromKeyTokens(ctx) {
	const unwantedPrefixes = [
		"ext",
		"extra",
		"project",
		"rootProject",
		"properties"
	];
	while (ctx.varTokens.length > 1 && ctx.varTokens[0] && unwantedPrefixes.includes(ctx.varTokens[0].value)) ctx.varTokens.shift();
	return ctx;
}
function coalesceVariable(ctx) {
	if (ctx.varTokens.length > 1) {
		ctx.varTokens[0].value = ctx.varTokens.map((token) => token.value).join(".");
		ctx.varTokens.length = 1;
	}
	return ctx;
}
function findVariableInKotlinImport(name, ctx, variables) {
	if (ctx.tmpKotlinImportStore.length && name.includes(".")) for (const tokens of ctx.tmpKotlinImportStore) {
		const lastToken = tokens.at(-1);
		// v8 ignore else -- needs a kotlin import whose prefix resolves to nothing
		if (lastToken && name.startsWith(`${lastToken.value}.`)) {
			const identifier = `${tokens.slice(0, -1).map((token) => token.value).join(".")}.${name}`;
			// v8 ignore else -- needs a kotlin import whose prefix resolves to nothing
			if (variables[identifier]) return variables[identifier];
		}
	}
}
function findVariable(name, ctx, variables = ctx.globalVars) {
	if (ctx.tmpNestingDepth.length) {
		const prefixParts = ctx.tmpNestingDepth.map((token) => token.value);
		for (let idx = ctx.tmpNestingDepth.length; idx > 0; idx -= 1) {
			const identifier = `${prefixParts.slice(0, idx).join(".")}.${name}`;
			if (variables[identifier]) return variables[identifier];
		}
	}
	if (variables[name]) return variables[name];
	return findVariableInKotlinImport(name, ctx, variables);
}
function interpolateString(childTokens, ctx, variables = ctx.globalVars) {
	const resolvedSubstrings = [];
	for (const childToken of childTokens) {
		const type = childToken.type;
		if (type === "string-value") resolvedSubstrings.push(childToken.value);
		else if (type === "symbol") {
			const varData = findVariable(childToken.value, ctx, variables);
			if (varData) resolvedSubstrings.push(varData.value);
			else return null;
		} else return null;
	}
	return resolvedSubstrings.join("");
}
const qStringValue = query.str((ctx, node) => {
	storeVarToken(ctx, node);
	return ctx;
});
const qStringValueAsSymbol = query.str((ctx, node) => {
	storeVarToken(ctx, {
		...node,
		type: "symbol"
	});
	return ctx;
});
const qProviderValue = query.tree({
	maxDepth: 1,
	type: "wrapped-tree",
	startsWith: "(",
	endsWith: ")",
	search: query.begin().end()
}).handler((ctx) => {
	if (ctx.varTokens.length > 1 && ctx.varTokens.at(-1)?.value === "get") ctx.varTokens.pop();
	return ctx;
});
const qVariableAssignmentIdentifier = query.sym(storeVarToken).many(query.alt(query.op(".").sym(storeVarToken), query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "[",
	endsWith: "]",
	search: query.begin().join(qStringValueAsSymbol).end()
})), 0, 32).handler(stripReservedPrefixFromKeyTokens);
const qVariableAccessIdentifier = query.handler((ctx) => {
	ctx.tmpTokenStore.backupVarAccessTokens = ctx.varTokens;
	ctx.varTokens = [];
	return ctx;
}).join(qVariableAssignmentIdentifier).opt(qProviderValue).handler(coalesceVariable).handler((ctx) => {
	ctx.varTokens = [...ctx.tmpTokenStore.backupVarAccessTokens, ...ctx.varTokens];
	delete ctx.tmpTokenStore.backupVarAccessTokens;
	return ctx;
});
const qPropertyAccessIdentifier = query.opt(query.sym(regEx(/^(?:rootProject|project)$/)).op(".")).alt(query.opt(query.sym("ext").op(".")).sym(regEx(/^(?:property|getProperty)$/)), query.sym(regEx(/^(?:extra|ext)$/)).op(".").sym("get")).tree({
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qStringValueAsSymbol).end()
}).opt(query.sym("as").sym("String"));
const qTemplateString = query.tree({
	type: "string-tree",
	maxDepth: 2,
	preHandler: (ctx) => {
		ctx.tmpTokenStore.templateTokens = [];
		return ctx;
	},
	search: query.alt(qStringValue, qPropertyAccessIdentifier, qVariableAccessIdentifier).handler((ctx) => {
		ctx.tmpTokenStore.templateTokens?.push(...ctx.varTokens);
		ctx.varTokens = [];
		return ctx;
	})
}).handler((ctx) => {
	ctx.varTokens = ctx.tmpTokenStore.templateTokens;
	return ctx;
});
function qConcatExpr(...matchers) {
	return query.alt(...matchers).many(query.op("+").alt(...matchers), 0, 32);
}
const qValueMatcher = qConcatExpr(qTemplateString, qPropertyAccessIdentifier, qVariableAccessIdentifier);
const qKotlinImport = query.sym("import").join(qVariableAssignmentIdentifier).handler((ctx) => {
	ctx.tmpKotlinImportStore.push(ctx.varTokens);
	return ctx;
}).handler(cleanupTempVars);
function qDotOrBraceExpr(symValue, matcher) {
	return query.sym(symValue).alt(query.op(".").join(matcher), query.tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "{",
		endsWith: "}",
		search: matcher
	}));
}
const qGroupId = qValueMatcher.handler((ctx) => storeInTokenMap(ctx, "groupId"));
const qArtifactId = qValueMatcher.handler((ctx) => storeInTokenMap(ctx, "artifactId"));
const qVersion = qValueMatcher.handler((ctx) => storeInTokenMap(ctx, "version"));
//#endregion
export { GRADLE_PLUGINS, GRADLE_TEST_SUITES, REGISTRY_URLS, cleanupTempVars, coalesceVariable, findVariable, findVariableInKotlinImport, increaseNestingDepth, interpolateString, loadFromTokenMap, prependNestingDepth, qArtifactId, qConcatExpr, qDotOrBraceExpr, qGroupId, qKotlinImport, qPropertyAccessIdentifier, qProviderValue, qStringValue, qStringValueAsSymbol, qTemplateString, qValueMatcher, qVariableAccessIdentifier, qVariableAssignmentIdentifier, qVersion, reduceNestingDepth, storeInTokenMap, storeVarToken, stripReservedPrefixFromKeyTokens };

//# sourceMappingURL=common.js.map