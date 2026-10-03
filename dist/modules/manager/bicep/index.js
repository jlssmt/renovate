import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { AzureBicepResourceDatasource } from "../../datasource/azure-bicep-resource/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/bicep/index.ts
var bicep_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://docs.microsoft.com/azure/azure-resource-manager/bicep/overview";
const categories = ["iac"];
const defaultConfig = { managerFilePatterns: ["/\\.bicep$/"] };
const supportedDatasources = [AzureBicepResourceDatasource.id];
//#endregion
export { bicep_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map