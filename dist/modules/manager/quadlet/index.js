import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/quadlet/index.ts
var quadlet_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html";
const categories = ["docker"];
const defaultConfig = { managerFilePatterns: [
	"/.+\\.container$/",
	"/.+\\.image$/",
	"/.+\\.volume$/"
] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, quadlet_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map