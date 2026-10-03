import { FILE_ACCESS_VIOLATION_ERROR } from "../../constants/error-messages.js";
import { GlobalConfig } from "../../config/global.js";
import { matchRegexOrGlob } from "../string-match.js";
import { logger } from "../../logger/index.js";
import upath from "upath";
//#region lib/util/fs/util.ts
/**
* Take a relative path reference from a repo-relative file and resolve it
* to a repo-relative path. Uses a virtual root to avoid upath.resolve
* prepending the real cwd for relative paths.
*/
function resolveRelativePathToRoot(baseFilePath, relativePath) {
	const virtualRoot = "/";
	const absoluteBase = upath.resolve(virtualRoot, baseFilePath);
	const absoluteResolved = upath.resolve(upath.dirname(absoluteBase), relativePath);
	return upath.relative(virtualRoot, absoluteResolved);
}
/**
* Filter a list of repo-relative file paths by a glob or regex pattern.
*/
function getMatchingFiles(pattern, allFiles) {
	return allFiles.filter((file) => matchRegexOrGlob(file, pattern));
}
function assertBaseDir(path, allowedDir) {
	if (!path.startsWith(allowedDir)) {
		logger.debug({
			path,
			allowedDir
		}, "Preventing access to file outside allowed directory");
		throw new Error(FILE_ACCESS_VIOLATION_ERROR);
	}
}
function ensurePath(path, key) {
	const baseDir = upath.resolve(GlobalConfig.get(key));
	const fullPath = upath.resolve(upath.isAbsolute(path) ? path : upath.join(baseDir, path));
	assertBaseDir(fullPath, baseDir);
	return fullPath;
}
function ensureLocalPath(path) {
	return ensurePath(path, "localDir");
}
function ensureCachePath(path) {
	return ensurePath(path, "cacheDir");
}
function isValidPath(path, key) {
	const baseDir = upath.resolve(GlobalConfig.get(key));
	return upath.resolve(upath.isAbsolute(path) ? path : upath.join(baseDir, path)).startsWith(baseDir);
}
//#endregion
export { ensureCachePath, ensureLocalPath, getMatchingFiles, isValidPath, resolveRelativePathToRoot };

//# sourceMappingURL=util.js.map