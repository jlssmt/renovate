import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GolangVersionDatasource } from "../../datasource/golang-version/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { PythonVersionDatasource } from "../../datasource/python-version/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/devcontainer/index.ts
var devcontainer_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	name: () => name,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const name = "Dev Container";
const url = "https://code.visualstudio.com/docs/devcontainers/containers";
const categories = ["docker"];
const defaultConfig = { managerFilePatterns: [
	"/^.devcontainer/devcontainer.json$/",
	"/^.devcontainer.json$/",
	"/^.devcontainer/[^/]+/devcontainer.json$/"
] };
const supportedDatasources = [
	DockerDatasource.id,
	GolangVersionDatasource.id,
	NodeVersionDatasource.id,
	PythonVersionDatasource.id,
	RubyVersionDatasource.id
];
//#endregion
export { categories, defaultConfig, devcontainer_exports, extractPackageFile, knownDepTypes, name, supportedDatasources, url };

//# sourceMappingURL=index.js.map