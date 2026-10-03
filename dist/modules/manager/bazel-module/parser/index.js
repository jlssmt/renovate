import { coerceArray } from "../../../../util/array.js";
import { Ctx } from "./context.js";
import { extensionTags } from "./extension-tags.js";
import { clearRepoRuleVariables, repoRuleCall, useRepoRuleAssignment } from "./repo-rules.js";
import { rules } from "./rules.js";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel-module/parser/index.ts
const rule = query.alt(rules, extensionTags, useRepoRuleAssignment, repoRuleCall);
const query$1 = query.tree({
	type: "root-tree",
	maxDepth: 16,
	search: rule
});
const starlarkLang = lang.createLang("starlark");
function parse(input) {
	clearRepoRuleVariables();
	const parsedResult = starlarkLang.query(input, query$1, new Ctx(input));
	return coerceArray(parsedResult?.results);
}
//#endregion
export { parse };

//# sourceMappingURL=index.js.map