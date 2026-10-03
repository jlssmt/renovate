import { regEx } from "../../../../util/regex.js";
import { kvParams } from "./common.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel-module/parser/rules.ts
const supportedRulesRegex = regEx(`^${[
	"archive_override",
	"bazel_dep",
	"git_override",
	"local_path_override",
	"single_version_override",
	"git_repository",
	"new_git_repository"
].join("|")}$`);
const rules = query.sym(supportedRulesRegex, (ctx, token) => ctx.startRule(token.value)).join(query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: kvParams,
	postHandler: (ctx) => ctx.endRule()
}));
//#endregion
export { rules };

//# sourceMappingURL=rules.js.map