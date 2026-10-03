import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { ManifestToml } from "./schema.js";
//#region lib/modules/manager/gleam/locked-version.ts
async function extractLockFileVersions(lockFilePath) {
	const content = await readLocalFile(lockFilePath, "utf8");
	if (!content) {
		logger.debug(`Gleam lock file ${lockFilePath} not found`);
		return null;
	}
	const versionsByPackage = /* @__PURE__ */ new Map();
	const lock = parseLockFile(content);
	if (!lock) {
		logger.debug(`Error parsing Gleam lock file ${lockFilePath}`);
		return null;
	}
	for (const pkg of coerceArray(lock.packages)) {
		const versions = coerceArray(versionsByPackage.get(pkg.name));
		versions.push(pkg.version);
		versionsByPackage.set(pkg.name, versions);
	}
	return versionsByPackage;
}
function parseLockFile(lockFileContent) {
	const res = ManifestToml.safeParse(lockFileContent);
	if (res.success) return res.data;
	logger.debug({ err: res.error }, "Error parsing manifest.toml.");
	return null;
}
//#endregion
export { extractLockFileVersions, parseLockFile };

//# sourceMappingURL=locked-version.js.map