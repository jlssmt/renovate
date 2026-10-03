import { safeCompile } from "../../../../../util/template/index.js";
//#region lib/workers/repository/update/pr/body/footer.ts
function getPrFooter(config) {
	if (config.prFooter) return `\n---\n\n${safeCompile(config.prFooter, config)}`;
	return "";
}
//#endregion
export { getPrFooter };

//# sourceMappingURL=footer.js.map