import api from "./api.js";
//#region lib/modules/manager/custom/index.ts
const customManagerList = Array.from(api.keys());
function isCustomManager(manager) {
	return api.has(manager);
}
//#endregion
export { customManagerList, isCustomManager };

//# sourceMappingURL=index.js.map