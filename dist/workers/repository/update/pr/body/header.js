import { compile } from "../../../../../util/template/index.js";
//#region lib/workers/repository/update/pr/body/header.ts
function getPrHeader(config) {
	if (!config.prHeader) return "";
	return `${compile(config.prHeader, config)}\n\n`;
}
//#endregion
export { getPrHeader };

//# sourceMappingURL=header.js.map