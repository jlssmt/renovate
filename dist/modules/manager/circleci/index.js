import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { OrbDatasource } from "../../datasource/orb/index.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/circleci/index.ts
var circleci_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "CircleCI";
const url = "https://circleci.com/docs/configuration-reference";
const categories = ["ci"];
const defaultConfig = { managerFilePatterns: ["/(^|/)\\.circleci/.+\\.ya?ml$/"] };
const supportedDatasources = [DockerDatasource.id, OrbDatasource.id];
//#endregion
export { categories, circleci_exports, defaultConfig, displayName, extractPackageFile, getRangeStrategy, knownDepTypes, supportedDatasources, url };

//# sourceMappingURL=index.js.map