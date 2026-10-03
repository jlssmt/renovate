import { regEx } from "../../../../util/regex.js";
import { booleanStringValues } from "./starlark.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel-module/parser/common.ts
const booleanValuesRegex = regEx(`^${booleanStringValues.join("|")}$`);
/**
* Matches key-value pairs:
* - `name = "foobar"`
* - `name = True`
* - `name = ["string"]`
**/
const kvParams = query.sym((ctx, token) => ctx.startAttribute(token.value)).op("=").alt(query.str((ctx, token) => ctx.addString(token.value)), query.sym(booleanValuesRegex, (ctx, token) => ctx.addBoolean(token.value)), query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "[",
	endsWith: "]",
	postHandler: (ctx) => ctx.endArray(),
	preHandler: (ctx) => ctx.startArray(),
	search: query.many(query.str((ctx, token) => ctx.addString(token.value)))
}));
//#endregion
export { kvParams };

//# sourceMappingURL=common.js.map