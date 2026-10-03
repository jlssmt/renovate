import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { CargoLock } from "./schema.js";
//#region lib/modules/manager/cargo/locked-version.ts
async function extractLockFileVersions(lockFilePath) {
	const content = await readLocalFile(lockFilePath, "utf8");
	if (content) return extractLockFileContentVersions(content);
	return null;
}
function extractLockFileContentVersions(content) {
	const versionsByPackage = /* @__PURE__ */ new Map();
	const lock = parseLockFile(content);
	if (!lock) return null;
	for (const pkg of coerceArray(lock.package)) {
		const versions = coerceArray(versionsByPackage.get(pkg.name));
		versions.push(pkg.version);
		versionsByPackage.set(pkg.name, versions);
	}
	return versionsByPackage;
}
function parseLockFile(lockFile) {
	const res = CargoLock.safeParse(lockFile);
	if (res.success) return res.data;
	logger.debug({ err: res.error }, "Error parsing Cargo lockfile.");
	return null;
}
//#endregion
export { extractLockFileContentVersions, extractLockFileVersions, parseLockFile };

//# sourceMappingURL=locked-version.js.map