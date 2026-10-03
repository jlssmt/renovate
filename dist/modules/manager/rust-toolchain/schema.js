import { Toml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/rust-toolchain/schema.ts
const RustToolchain = Toml.pipe(z.object({ toolchain: z.object({
	channel: z.string().optional(),
	path: z.string().optional()
}) }));
//#endregion
export { RustToolchain };

//# sourceMappingURL=schema.js.map