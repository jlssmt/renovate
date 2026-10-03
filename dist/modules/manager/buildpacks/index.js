import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BuildpacksRegistryDatasource } from "../../datasource/buildpacks-registry/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/buildpacks/index.ts
var buildpacks_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const defaultConfig = {
	commitMessageTopic: "buildpack {{depName}}",
	managerFilePatterns: ["/(^|/)project\\.toml$/"],
	pinDigests: false
};
const categories = [
	"docker",
	"ci",
	"cd"
];
const supportedDatasources = [DockerDatasource.id, BuildpacksRegistryDatasource.id];
//#endregion
export { buildpacks_exports, categories, defaultConfig, extractPackageFile, supportedDatasources };

//# sourceMappingURL=index.js.map