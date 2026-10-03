import { compile } from "../../../util/template/index.js";
//#region lib/workers/repository/config-migration/common.ts
const migrationBranchTemplate = "{{{branchPrefix}}}migrate-config";
function getMigrationBranchName(config) {
	return compile(migrationBranchTemplate, config);
}
//#endregion
export { getMigrationBranchName };

//# sourceMappingURL=common.js.map