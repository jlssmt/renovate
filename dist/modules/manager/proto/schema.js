import { Toml } from "../../../util/schema-utils/index.js";
import { isString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/proto/schema.ts
/**
* Known non-version sections in .prototools files.
* These are structured TOML tables, not version pins.
* @see https://moonrepo.dev/docs/proto/config
*/
const nonVersionKeys = /* @__PURE__ */ new Set([
	"settings",
	"plugins",
	"tools",
	"env",
	"shell",
	"backends"
]);
const ProtoToolsFile = Toml.pipe(z.record(z.string(), z.unknown()).transform((data) => {
	const versions = {};
	for (const [key, value] of Object.entries(data)) if (isString(value) && !nonVersionKeys.has(key)) versions[key] = value;
	return { versions };
}));
//#endregion
export { ProtoToolsFile, nonVersionKeys };

//# sourceMappingURL=schema.js.map