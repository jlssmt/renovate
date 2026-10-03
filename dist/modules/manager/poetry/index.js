import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { bumpPackageVersion } from "../pep621/update.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { updateLockedDependency } from "./update-locked.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
//#region lib/modules/manager/poetry/index.ts
var poetry_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supersedesManagers: () => supersedesManagers,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const supersedesManagers = ["pep621"];
const lockFileNames = ["poetry.lock"];
const url = "https://python-poetry.org/docs";
const categories = ["python"];
const defaultConfig = { managerFilePatterns: ["/(^|/)pyproject\\.toml$/"] };
const supportedDatasources = [
	PypiDatasource.id,
	GithubTagsDatasource.id,
	GithubReleasesDatasource.id,
	GitlabTagsDatasource.id,
	GitRefsDatasource.id,
	GitTagsDatasource.id
];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, poetry_exports, supersedesManagers, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, updateLockedDependency, url };

//# sourceMappingURL=index.js.map