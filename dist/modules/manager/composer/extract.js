import { logger } from "../../../logger/index.js";
import { ComposerExtract } from "./schema.js";
//#region lib/modules/manager/composer/extract.ts
async function extractPackageFile(content, packageFile) {
	const res = await ComposerExtract.safeParseAsync({
		content,
		fileName: packageFile
	});
	if (!res.success) {
		logger.debug({
			packageFile,
			err: res.error
		}, "Composer: extract failed");
		return null;
	}
	return res.data;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map