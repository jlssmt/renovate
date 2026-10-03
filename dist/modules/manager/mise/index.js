import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { deduplicateArray } from "../../../util/array.js";
import { CondaDatasource } from "../../datasource/conda/index.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabReleasesDatasource } from "../../datasource/gitlab-releases/index.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { JavaVersionDatasource } from "../../datasource/java-version/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { NugetDatasource } from "../../datasource/nuget/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { RubygemsDatasource } from "../../datasource/rubygems/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { supportedDatasources as supportedDatasources$1 } from "../asdf/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
import { updateLockedDependency } from "./update-locked.js";
//#region lib/modules/manager/mise/index.ts
var mise_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	maybeSupportedBackendDatasources: () => maybeSupportedBackendDatasources,
	supportedBackendDatasources: () => supportedBackendDatasources,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const displayName = "mise-en-place";
const lockFileNames = ["mise.lock"];
const url = "https://mise.jdx.dev";
const defaultConfig = {
	managerFilePatterns: [
		"**/{,.}mise{,.*}.toml",
		"**/{,.}mise/config{,.*}.toml",
		"**/.config/mise{,.*}.toml",
		"**/.config/mise/{mise,config}{,.*}.toml",
		"**/.config/mise/conf.d/*.toml",
		"**/.rtx{,.*}.toml"
	],
	pinDigests: false
};
const backendDatasources = {
	core: [
		GithubReleasesDatasource.id,
		GithubTagsDatasource.id,
		JavaVersionDatasource.id,
		NodeVersionDatasource.id,
		RubyVersionDatasource.id,
		RustVersionDatasource.id
	],
	asdf: supportedDatasources$1,
	aqua: [GithubTagsDatasource.id],
	cargo: [
		CrateDatasource.id,
		GitTagsDatasource.id,
		GitRefsDatasource.id
	],
	conda: [CondaDatasource.id],
	dotnet: [NugetDatasource.id],
	gem: [RubygemsDatasource.id],
	github: [GithubReleasesDatasource.id],
	gitlab: [GitlabReleasesDatasource.id],
	go: [GoDatasource.id],
	npm: [NpmDatasource.id],
	pipx: [
		PypiDatasource.id,
		GithubTagsDatasource.id,
		GitRefsDatasource.id
	],
	pypi: [
		PypiDatasource.id,
		GithubTagsDatasource.id,
		GitRefsDatasource.id
	],
	spm: [GithubReleasesDatasource.id],
	ubi: [GithubReleasesDatasource.id],
	vfox: []
};
/**
* Backends that are definitely supported out-of-the-box with Renovate.
*/
const supportedBackendDatasources = new Set(Object.keys(backendDatasources).filter((key) => key !== "vfox"));
/**
* Backends that may require some additional work for users to configure Renovate to update them.
*/
const maybeSupportedBackendDatasources = new Set(Object.keys(backendDatasources).filter((key) => key === "vfox" || key === "aqua"));
const supportedDatasources = deduplicateArray(Object.values(backendDatasources).flat()).sort();
//#endregion
export { defaultConfig, displayName, extractPackageFile, knownDepTypes, lockFileNames, maybeSupportedBackendDatasources, mise_exports, supportedBackendDatasources, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, updateLockedDependency, url };

//# sourceMappingURL=index.js.map