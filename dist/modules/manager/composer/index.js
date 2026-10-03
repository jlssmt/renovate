import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/composer/index.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { PackagistDatasource } from "../../datasource/packagist/index.js";
import "./utils.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { getRangeStrategy } from "./range.js";
import { updateLockedDependency } from "./update-locked.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/composer/index.ts
var composer_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	getRangeStrategy: () => getRangeStrategy,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const lockFileNames = ["composer.lock"];
const url = "https://getcomposer.org/doc";
const categories = ["php"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)([\\w-]*)composer\\.json$/"],
	versioning: id
};
const supportedDatasources = [
	BitbucketTagsDatasource.id,
	GitTagsDatasource.id,
	PackagistDatasource.id
];
//#endregion
export { categories, composer_exports, defaultConfig, extractPackageFile, getRangeStrategy, knownDepTypes, lockFileNames, supportedDatasources, updateArtifacts, updateLockedDependency, url };

//# sourceMappingURL=index.js.map