import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/ansible/index.ts
var ansible_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.ansible.com";
const categories = ["ansible", "iac"];
const defaultConfig = { managerFilePatterns: ["/(^|/)tasks/[^/]+\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id];
//#endregion
export { ansible_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map