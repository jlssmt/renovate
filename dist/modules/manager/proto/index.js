import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/proto/index.ts
var proto_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "proto";
const url = "https://moonrepo.dev/proto";
const defaultConfig = { managerFilePatterns: ["**/.prototools"] };
const supportedDatasources = [
	GithubReleasesDatasource.id,
	GithubTagsDatasource.id,
	NodeVersionDatasource.id,
	NpmDatasource.id,
	RubyVersionDatasource.id,
	RustVersionDatasource.id
];
//#endregion
export { defaultConfig, displayName, extractPackageFile, proto_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map