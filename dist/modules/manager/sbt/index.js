import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import "../../versioning/ivy/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { SbtPackageDatasource } from "../../datasource/sbt-package/index.js";
import { SbtPluginDatasource } from "../../datasource/sbt-plugin/index.js";
import { extractAllPackageFiles, extractPackageFile } from "./extract.js";
import { bumpPackageVersion } from "./update.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
//#region lib/modules/manager/sbt/index.ts
var sbt_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => "sbt",
	extractAllPackageFiles: () => extractAllPackageFiles,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	url: () => url
});
const url = "https://www.scala-sbt.org";
const categories = ["java"];
const defaultConfig = {
	managerFilePatterns: [
		"/\\.sbt$/",
		"/project/[^/]*\\.scala$/",
		"/project/build\\.properties$/",
		"/(^|/)repositories$/"
	],
	versioning: "ivy"
};
const supportedDatasources = [
	MavenDatasource.id,
	SbtPackageDatasource.id,
	SbtPluginDatasource.id,
	GithubReleasesDatasource.id
];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, extractAllPackageFiles, extractPackageFile, knownDepTypes, sbt_exports, supportedDatasources, supportsDynamicDepTypesNote, url };

//# sourceMappingURL=index.js.map