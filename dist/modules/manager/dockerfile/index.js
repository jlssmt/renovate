import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { ApkDatasource } from "../../datasource/apk/index.js";
import { DebDatasource } from "../../datasource/deb/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/dockerfile/index.ts
var dockerfile_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.docker.com/build/concepts/dockerfile";
const categories = ["docker"];
const defaultConfig = { managerFilePatterns: ["/(^|/|\\.)([Dd]ocker|[Cc]ontainer)file$/", "/(^|/)([Dd]ocker|[Cc]ontainer)file[^/]*$/"] };
const supportedDatasources = [
	ApkDatasource.id,
	DebDatasource.id,
	DockerDatasource.id
];
//#endregion
export { categories, defaultConfig, dockerfile_exports, extractPackageFile, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map