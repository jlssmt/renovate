import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DartVersionDatasource } from "../../datasource/dart-version/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { DotnetVersionDatasource } from "../../datasource/dotnet-version/index.js";
import { FlutterVersionDatasource } from "../../datasource/flutter-version/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { HexpmBobDatasource } from "../../datasource/hexpm-bob/index.js";
import { JavaVersionDatasource } from "../../datasource/java-version/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/asdf/index.ts
var asdf_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "asdf";
const url = "https://asdf-vm.com";
const defaultConfig = { managerFilePatterns: ["/(^|/)\\.tool-versions$/"] };
const supportedDatasources = [
	DartVersionDatasource.id,
	DockerDatasource.id,
	DotnetVersionDatasource.id,
	FlutterVersionDatasource.id,
	GithubReleasesDatasource.id,
	GithubTagsDatasource.id,
	HexpmBobDatasource.id,
	JavaVersionDatasource.id,
	NodeVersionDatasource.id,
	NpmDatasource.id,
	PypiDatasource.id,
	RubyVersionDatasource.id,
	RustVersionDatasource.id
];
//#endregion
export { asdf_exports, defaultConfig, displayName, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map