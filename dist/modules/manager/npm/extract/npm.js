import { logger } from "../../../../logger/index.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { PackageLock } from "../schema.js";
//#region lib/modules/manager/npm/extract/npm.ts
async function getNpmLock(filePath) {
	const lockfileContent = await readLocalFile(filePath, "utf8");
	if (!lockfileContent) {
		logger.debug({ filePath }, "Npm: unable to read lockfile");
		return { lockedVersions: {} };
	}
	const parsedLockfile = PackageLock.safeParse(lockfileContent);
	if (!parsedLockfile.success) {
		logger.debug({
			filePath,
			err: parsedLockfile.error
		}, "Npm: unable to parse lockfile");
		return { lockedVersions: {} };
	}
	return parsedLockfile.data;
}
//#endregion
export { getNpmLock };

//# sourceMappingURL=npm.js.map