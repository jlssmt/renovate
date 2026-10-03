import { extractPep723 } from "./utils.js";
//#region lib/modules/manager/pep723/extract.ts
function extractPackageFile(content, packageFile) {
	return extractPep723(content, packageFile);
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map