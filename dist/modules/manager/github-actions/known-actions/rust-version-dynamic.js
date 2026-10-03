import { RustVersionDatasource } from "../../../datasource/rust-version/index.js";
import { parseValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/rust-version-dynamic.ts
const SetupRustToolchainWith = z.object({ toolchain: z.string().optional() }).transform(({ toolchain }) => [parseValue(toolchain?.split(",").pop()?.trim())]);
const rustVersionDynamicActions = { "actions-rust-lang/setup-rust-toolchain": {
	datasource: RustVersionDatasource.id,
	packageName: "rust",
	withSchema: SetupRustToolchainWith
} };
//#endregion
export { rustVersionDynamicActions };

//# sourceMappingURL=rust-version-dynamic.js.map