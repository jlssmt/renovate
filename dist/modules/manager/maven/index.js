import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractAllPackageFiles } from "./extract.js";
import { bumpPackageVersion, updateDependency } from "./update.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/maven/index.ts
var maven_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://maven.apache.org";
const categories = ["java"];
const defaultConfig = { managerFilePatterns: [
	"/(^|/|\\.)pom\\.xml$/",
	"/(^|/)pom\\.template\\.xml$/",
	"/^(((\\.mvn)|(\\.m2))/)?settings\\.xml$/",
	"/(^|/)\\.mvn/extensions\\.xml$/"
] };
const supportedDatasources = [MavenDatasource.id, DockerDatasource.id];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, extractAllPackageFiles, knownDepTypes, maven_exports, supportedDatasources, updateDependency, url };

//# sourceMappingURL=index.js.map