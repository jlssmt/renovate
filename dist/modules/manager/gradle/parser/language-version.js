import { regEx } from "../../../../util/regex.js";
import { qDotOrBraceExpr } from "./common.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser/language-version.ts
const qVersionNumber = query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	maxMatches: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.num((ctx, node) => {
		ctx.javaLanguageVersion = node.value;
		return ctx;
	})
});
const qKotlinShortNotationToolchain = qDotOrBraceExpr("kotlin", query.sym("jvmToolchain").join(qVersionNumber));
const qJavaLanguageVersion = query.sym("JavaLanguageVersion").op(".").sym("of").join(qVersionNumber);
const qLongFormToolchainVersion = qDotOrBraceExpr(regEx(/^(?:java|kotlin)$/), qDotOrBraceExpr(regEx(/^(?:toolchain|jvmToolchain)$/), query.sym("languageVersion").alt(query.op("=").join(qJavaLanguageVersion), query.op(".").sym("set").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.begin().join(qJavaLanguageVersion).end()
}))));
const qToolchainVersion = query.alt(qKotlinShortNotationToolchain, qLongFormToolchainVersion);
//#endregion
export { qToolchainVersion };

//# sourceMappingURL=language-version.js.map