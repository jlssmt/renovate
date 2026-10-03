import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { Unity3dDatasource } from "../../datasource/unity3d/index.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/unity3d/index.ts
var unity3d_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources
});
const categories = ["dotnet"];
const defaultConfig = { managerFilePatterns: ["**/ProjectSettings/ProjectVersion.txt"] };
const supportedDatasources = [Unity3dDatasource.id];
//#endregion
export { categories, defaultConfig, extractPackageFile, supportedDatasources, unity3d_exports };

//# sourceMappingURL=index.js.map