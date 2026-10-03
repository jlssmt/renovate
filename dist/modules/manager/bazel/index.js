import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/bazel/index.ts
var bazel_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const url = "https://bazel.build/docs";
const categories = ["bazel"];
const defaultConfig = { managerFilePatterns: [
	"/(^|/)WORKSPACE(|\\.bazel|\\.bzlmod)$/",
	"/\\.WORKSPACE\\.bazel$/",
	"/\\.bzl$/"
] };
const supportedDatasources = [
	DockerDatasource.id,
	GithubReleasesDatasource.id,
	GithubTagsDatasource.id,
	GoDatasource.id
];
//#endregion
export { bazel_exports, categories, defaultConfig, extractPackageFile, knownDepTypes, supportedDatasources, updateArtifacts, url };

//# sourceMappingURL=index.js.map