import { regEx } from "../../../../util/regex.js";
import { kvParams } from "./common.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel-module/parser/repo-rules.ts
const repoRuleVariables = /* @__PURE__ */ new Map();
const useRepoRuleAssignment = query.sym((ctx, token) => {
	ctx._tempVariableName = token.value;
	return ctx;
}).op("=").sym(regEx(/^use_repo_rule$/)).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "(",
	endsWith: ")",
	search: query.many(query.str((ctx, token) => {
		ctx._tempStrings ??= [];
		ctx._tempStrings.push(token.value);
		return ctx;
	})),
	postHandler: (ctx, _tree) => {
		const variableName = ctx._tempVariableName;
		const strings = ctx._tempStrings;
		if (variableName && strings && strings.length >= 2) {
			const bzlFile = strings[0];
			const ruleName = strings[1];
			repoRuleVariables.set(variableName, {
				bzlFile,
				ruleName
			});
			ctx.startUseRepoRule(variableName, bzlFile, ruleName);
			ctx.endUseRepoRule();
		}
		delete ctx._tempVariableName;
		delete ctx._tempStrings;
		return ctx;
	}
});
const repoRuleCall = query.sym(regEx(/^[a-zA-Z_]\w*$/), (ctx, token) => {
	return ctx.startRepoRuleCall(token.value, token.offset);
}).join(query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: kvParams,
	postHandler: (ctx, tree) => {
		const { endsWith } = tree;
		const endOffset = endsWith.offset + endsWith.value.length;
		return ctx.endRepoRuleCall(endOffset);
	}
}));
function clearRepoRuleVariables() {
	repoRuleVariables.clear();
}
//#endregion
export { clearRepoRuleVariables, repoRuleCall, useRepoRuleAssignment };

//# sourceMappingURL=repo-rules.js.map