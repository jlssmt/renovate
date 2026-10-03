import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/docker-compose/index.ts
var docker_compose_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.docker.com/compose";
const categories = ["docker"];
const defaultConfig = { managerFilePatterns: ["/(^|/)(?:docker-)?compose[^/]*\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, docker_compose_exports, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map