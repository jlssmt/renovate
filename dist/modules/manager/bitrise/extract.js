import { logger } from "../../../logger/index.js";
import { BitriseFile } from "./schema.js";
//#region lib/modules/manager/bitrise/extract.ts
function extractPackageFile(content, packageFile) {
	const deps = BitriseFile.catch(({ error: err }) => {
		logger.debug({
			err,
			packageFile
		}, `Failed to parse Bitrise YAML config`);
		return [];
	}).parse(content);
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map