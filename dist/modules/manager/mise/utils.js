import { logger } from "../../../logger/index.js";
import { MiseFile } from "./schema.js";
//#region lib/modules/manager/mise/utils.ts
function parseTomlFile(content, packageFile) {
	const res = MiseFile.safeParse(content);
	if (res.success) return res.data;
	logger.debug({
		err: res.error,
		packageFile
	}, "Error parsing Mise file.");
	return null;
}
//#endregion
export { parseTomlFile };

//# sourceMappingURL=utils.js.map