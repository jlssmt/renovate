import { parse } from "@cdktf/hcl2json";
//#region lib/modules/manager/terraform/hcl/index.ts
async function parseHCL(content, fileName) {
	try {
		return await parse(fileName, content);
	} catch {
		return null;
	}
}
//#endregion
export { parseHCL };

//# sourceMappingURL=index.js.map