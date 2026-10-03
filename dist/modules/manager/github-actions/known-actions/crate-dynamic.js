import { CrateDatasource } from "../../../datasource/crate/index.js";
import { parseValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/crate-dynamic.ts
const CargoInstallWith = z.object({
	crate: z.string(),
	version: z.string().optional()
}).transform(({ crate, version }) => [{
	packageName: crate,
	...parseValue(version)
}]);
const crateDynamicActions = { "baptiste0928/cargo-install": {
	datasource: CrateDatasource.id,
	packageName: "",
	withSchema: CargoInstallWith
} };
//#endregion
export { crateDynamicActions };

//# sourceMappingURL=crate-dynamic.js.map