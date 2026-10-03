import { logger } from "../../../logger/index.js";
import { Pubspec, PubspecLock } from "./schema.js";
//#region lib/modules/manager/pub/utils.ts
function parsePubspec(fileName, fileContent) {
	const res = Pubspec.safeParse(fileContent);
	if (res.success) return res.data;
	logger.debug({
		err: res.error,
		fileName
	}, "Error parsing pubspec.");
	return null;
}
function parsePubspecLock(fileName, fileContent) {
	const res = PubspecLock.safeParse(fileContent);
	if (res.success) return res.data;
	logger.debug({
		err: res.error,
		fileName
	}, "Error parsing pubspec lockfile.");
	return null;
}
//#endregion
export { parsePubspec, parsePubspecLock };

//# sourceMappingURL=utils.js.map