import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { DotnetVersionDatasource } from "../../datasource/dotnet-version/index.js";
import { NugetDatasource } from "../../datasource/nuget/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { bumpPackageVersion } from "./update.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/nuget/index.ts
var nuget_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = ["packages.lock.json"];
const displayName = "NuGet";
const url = "https://learn.microsoft.com/nuget";
const categories = ["dotnet"];
const defaultConfig = {
	managerFilePatterns: [
		"/\\.(?:cs|fs|vb|sql)proj$/",
		"/\\.(?:props|targets)$/",
		"/(^|/)dotnet-tools\\.json$/",
		"/(^|/)global\\.json$/"
	],
	rangeStrategy: "bump",
	packageRules: [{
		matchDepTypes: ["msbuild-sdk"],
		rangeStrategy: "bump"
	}]
};
const supportedDatasources = [
	DockerDatasource.id,
	DotnetVersionDatasource.id,
	NugetDatasource.id
];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, lockFileNames, nuget_exports, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map