import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
//#region lib/modules/manager/nodenv/extract.ts
function extractPackageFile(content) {
	return { deps: [{
		depName: "node",
		currentValue: content.trim(),
		datasource: NodeVersionDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map