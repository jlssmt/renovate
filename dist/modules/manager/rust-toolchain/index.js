import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/rust-toolchain/index.ts
var rust_toolchain_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "Rust Toolchain";
const url = "https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file";
const categories = ["rust"];
const defaultConfig = {
	commitMessageTopic: "Rust",
	managerFilePatterns: ["/(^|/)rust-toolchain(\\.toml)?$/"]
};
const supportedDatasources = [RustVersionDatasource.id];
//#endregion
export { categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, rust_toolchain_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map