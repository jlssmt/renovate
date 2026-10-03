import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { id } from "../../versioning/hermit/index.js";
import { HermitDatasource } from "../../datasource/hermit/index.js";
import { defaultConfig as defaultConfig$1 } from "./default-config.js";
import { updateArtifacts } from "./artifacts.js";
import { extractPackageFile } from "./extract.js";
import { updateDependency } from "./update.js";
//#region lib/modules/manager/hermit/index.ts
var hermit_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://cashapp.github.io/hermit";
const defaultConfig = {
	managerFilePatterns: defaultConfig$1.managerFilePatterns,
	excludeCommitPaths: defaultConfig$1.excludeCommitPaths,
	versioning: id
};
const supportedDatasources = [HermitDatasource.id];
//#endregion
export { defaultConfig, extractPackageFile, hermit_exports, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map