import { RustVersionDatasource } from "../../../datasource/rust-version/index.js";
import { valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/rust-version.ts
const rustVersionActions = {
	"dtolnay/rust-toolchain": {
		datasource: RustVersionDatasource.id,
		packageName: "rust",
		withSchema: valSchema("toolchain")
	},
	"moonrepo/setup-rust": {
		datasource: RustVersionDatasource.id,
		packageName: "rust",
		withSchema: valSchema("channel")
	}
};
//#endregion
export { rustVersionActions };

//# sourceMappingURL=rust-version.js.map