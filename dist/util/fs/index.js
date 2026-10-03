import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { logWarningIfUnicodeHiddenCharactersInPackageFile } from "../unicode.js";
import { ensureCachePath, ensureLocalPath, isValidPath } from "./util.js";
import util from "node:util";
import { isNonEmptyString } from "@sindresorhus/is";
import fs from "fs-extra";
import stream from "node:stream";
import upath from "upath";
import { findUp } from "find-up";
//#region lib/util/fs/index.ts
const pipeline = util.promisify(stream.pipeline);
function getParentDir(fileName) {
	return upath.parse(fileName).dir;
}
function getSiblingFileName(fileName, siblingName) {
	const subDirectory = getParentDir(fileName);
	return upath.join(subDirectory, siblingName);
}
async function readLocalFile(fileName, encoding) {
	const localFileName = ensureLocalPath(fileName);
	try {
		const fileContent = encoding ? await fs.readFile(localFileName, encoding) : await fs.readFile(localFileName);
		logWarningIfUnicodeHiddenCharactersInPackageFile(fileName, fileContent);
		return fileContent;
	} catch (err) {
		logger.trace({ err }, "Error reading local file");
		return null;
	}
}
async function readLocalSymlink(fileName) {
	const localFileName = ensureLocalPath(fileName);
	try {
		return await fs.readlink(localFileName);
	} catch (err) {
		logger.trace({ err }, "Error reading local symlink");
		return null;
	}
}
async function writeLocalFile(fileName, fileContent) {
	const localFileName = ensureLocalPath(fileName);
	await fs.outputFile(localFileName, fileContent);
}
async function deleteLocalFile(fileName) {
	if (GlobalConfig.get("platform") === "local") throw new Error("Cannot delete file when platform=local");
	if (GlobalConfig.get("localDir")) {
		const localFileName = ensureLocalPath(fileName);
		await fs.remove(localFileName);
	}
}
async function renameLocalFile(fromFile, toFile) {
	const fromPath = ensureLocalPath(fromFile);
	const toPath = ensureLocalPath(toFile);
	await fs.move(fromPath, toPath);
}
async function renameCacheFile(fromFile, toFile) {
	const fromPath = ensureCachePath(fromFile);
	const toPath = ensureCachePath(toFile);
	await fs.rename(fromPath, toPath);
}
async function ensureDir(dirName) {
	// v8 ignore else -- TODO: add test #40625
	if (isNonEmptyString(dirName)) await fs.ensureDir(dirName);
}
async function ensureLocalDir(dirName) {
	const fullPath = ensureLocalPath(dirName);
	await fs.ensureDir(fullPath);
	return fullPath;
}
async function ensureCacheDir(name) {
	const cacheDirName = ensureCachePath(`others/${name}`);
	await fs.ensureDir(cacheDirName);
	return cacheDirName;
}
/**
* Return the path of the private cache directory. This directory is wiped
* between repositories, so they can be used to store private registries' index
* without risk of that information leaking to other repositories/users.
*/
function privateCacheDir() {
	const cacheDir = GlobalConfig.get("cacheDir");
	return upath.join(cacheDir, "__renovate-private-cache");
}
async function localPathExists(pathName) {
	const path = ensureLocalPath(pathName);
	try {
		return !!await fs.stat(path);
	} catch {
		return false;
	}
}
/**
* Validate local path without throwing.
* @param path Path to check
* @returns `true` if given `path` is a valid local path, otherwise `false`.
*/
function isValidLocalPath(path) {
	return isValidPath(path, "localDir");
}
/**
* Tries to find `otherFileName` in the directory where
* `existingFileNameWithPath` is, then in its parent directory, then in the
* grandparent, until we reach the top-level directory. All paths
* must be relative to `localDir`.
*/
async function findLocalSiblingOrParent(existingFileNameWithPath, otherFileName) {
	if (upath.isAbsolute(existingFileNameWithPath)) return null;
	if (upath.isAbsolute(otherFileName)) return null;
	let current = existingFileNameWithPath;
	while (current !== "") {
		current = getParentDir(current);
		const candidate = upath.join(current, otherFileName);
		if (await localPathExists(candidate)) return candidate;
	}
	return null;
}
/**
* Get files by name from directory
*/
async function readLocalDirectory(path) {
	const localPath = ensureLocalPath(path);
	return await fs.readdir(localPath);
}
function createCacheWriteStream(path) {
	const fullPath = ensureCachePath(path);
	return fs.createWriteStream(fullPath);
}
function createCacheReadStream(path) {
	const fullPath = ensureCachePath(path);
	return fs.createReadStream(fullPath);
}
async function localPathIsFile(pathName) {
	const path = ensureLocalPath(pathName);
	try {
		return (await fs.stat(path)).isFile();
	} catch {
		return false;
	}
}
async function localPathIsSymbolicLink(pathName) {
	const path = ensureLocalPath(pathName);
	try {
		return (await fs.lstat(path)).isSymbolicLink();
	} catch {
		return false;
	}
}
/**
* Find a file or directory by walking up parent directories within localDir
*/
async function findUpLocal(fileName, cwd) {
	const localDir = GlobalConfig.get("localDir");
	const absoluteCwd = upath.join(localDir, cwd);
	const normalizedAbsoluteCwd = upath.normalizeSafe(absoluteCwd);
	const res = await findUp(fileName, {
		cwd: normalizedAbsoluteCwd,
		type: "file"
	});
	if (!isNonEmptyString(res) || !isNonEmptyString(localDir)) return null;
	const safePath = upath.normalizeSafe(res);
	if (safePath.startsWith(localDir)) {
		let relativePath = safePath.replace(localDir, "");
		// v8 ignore else -- TODO: add test #40625
		if (relativePath.startsWith("/")) relativePath = relativePath.substring(1);
		return relativePath;
	}
	return null;
}
function chmodLocalFile(fileName, mode) {
	const fullFileName = ensureLocalPath(fileName);
	return fs.chmod(fullFileName, mode);
}
async function statLocalFile(fileName) {
	const fullFileName = ensureLocalPath(fileName);
	try {
		return await fs.stat(fullFileName);
	} catch {
		return null;
	}
}
async function statCacheFile(pathName) {
	const path = ensureCachePath(pathName);
	try {
		return await fs.stat(path);
	} catch {
		return null;
	}
}
async function rmCache(path) {
	const fullPath = ensureCachePath(path);
	await fs.rm(fullPath, {
		recursive: true,
		force: true
	});
}
async function cachePathExists(pathName) {
	const path = ensureCachePath(pathName);
	try {
		return !!await fs.stat(path);
	} catch {
		return false;
	}
}
function readCacheFile(fileName, encoding) {
	const fullPath = ensureCachePath(fileName);
	return encoding ? fs.readFile(fullPath, encoding) : fs.readFile(fullPath);
}
function outputCacheFile(file, data) {
	const filePath = ensureCachePath(file);
	return fs.outputFile(filePath, data);
}
function readSystemFile(fileName, encoding) {
	return encoding ? fs.readFile(fileName, encoding) : fs.readFile(fileName);
}
async function writeSystemFile(fileName, data) {
	await fs.outputFile(fileName, data);
}
async function getLocalFiles(fileNames) {
	const fileContentMap = {};
	for (const fileName of fileNames) fileContentMap[fileName] = await readLocalFile(fileName, "utf8");
	return fileContentMap;
}
//#endregion
export { cachePathExists, chmodLocalFile, createCacheReadStream, createCacheWriteStream, deleteLocalFile, ensureCacheDir, ensureDir, ensureLocalDir, findLocalSiblingOrParent, findUpLocal, getLocalFiles, getParentDir, getSiblingFileName, isValidLocalPath, localPathExists, localPathIsFile, localPathIsSymbolicLink, outputCacheFile, pipeline, privateCacheDir, readCacheFile, readLocalDirectory, readLocalFile, readLocalSymlink, readSystemFile, renameCacheFile, renameLocalFile, rmCache, statCacheFile, statLocalFile, writeLocalFile, writeSystemFile };

//# sourceMappingURL=index.js.map