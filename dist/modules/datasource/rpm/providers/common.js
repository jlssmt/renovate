import { logger } from "../../../../logger/index.js";
import { toSha256 } from "../../../../util/hash.js";
import { cachePathExists, createCacheReadStream, createCacheWriteStream, ensureCacheDir, pipeline, renameCacheFile, rmCache, statCacheFile } from "../../../../util/fs/index.js";
import { acquireLock } from "../../../../util/mutex.js";
import { isNullOrUndefined } from "@sindresorhus/is";
import { randomUUID } from "node:crypto";
import upath from "upath";
import { createGunzip } from "node:zlib";
//#region lib/modules/datasource/rpm/providers/common.ts
const cacheSubDir = "rpm";
function formatRpmVersion(ver, rel) {
	if (isNullOrUndefined(ver)) return null;
	const version = String(ver);
	if (isNullOrUndefined(rel)) return version;
	return `${version}-${String(rel)}`;
}
function buildReleaseResult(versions) {
	const uniqueVersions = [...new Set(versions)];
	if (uniqueVersions.length === 0) return null;
	return { releases: uniqueVersions.map((version) => ({ version })) };
}
async function getFileCreationTime(filePath) {
	return (await statCacheFile(filePath))?.ctime;
}
async function checkIfModified(url, lastDownloadTimestamp, http) {
	const options = { headers: { "If-Modified-Since": lastDownloadTimestamp.toUTCString() } };
	try {
		return (await http.head(url, options)).statusCode !== 304;
	} catch (err) {
		logger.warn({
			err,
			lastDownloadTimestamp,
			url
		}, "Could not determine if metadata file is modified since last download");
		return true;
	}
}
async function downloadFileToCache(url, cachePath, http, lastDownloadTimestamp) {
	let needsToDownload = true;
	if (lastDownloadTimestamp) needsToDownload = await checkIfModified(url, lastDownloadTimestamp, http);
	if (!needsToDownload) {
		logger.debug(`No need to download ${url}, file is up to date.`);
		return false;
	}
	const readStream = http.stream(url);
	const writeStream = createCacheWriteStream(cachePath);
	await pipeline(readStream, writeStream);
	const compressedStats = await statCacheFile(cachePath);
	if (!compressedStats || compressedStats.size === 0) {
		logger.debug(`Empty response body from getting ${url}.`);
		throw new Error(`Empty response body from getting ${url}.`);
	}
	return true;
}
async function decompressFile(compressedFile, decompressedFile) {
	await pipeline(createCacheReadStream(compressedFile), createGunzip(), createCacheWriteStream(decompressedFile));
}
async function getCachedDecompressedFile(http, url, extension) {
	const releaseLock = await acquireLock(`decompressed-file:${url}:${extension}`, "datasource-rpm");
	try {
		const cacheDir = await ensureCacheDir(cacheSubDir);
		const urlHash = toSha256(url);
		const decompressedFile = upath.join(cacheDir, `${urlHash}.${extension}`);
		let lastTimestamp = await getFileCreationTime(decompressedFile);
		const compressedFile = upath.join(cacheDir, `${randomUUID()}_${urlHash}.gz`);
		const decompressedTempFile = upath.join(cacheDir, `${randomUUID()}_${urlHash}.${extension}`);
		try {
			if (await downloadFileToCache(url, compressedFile, http, lastTimestamp) || !lastTimestamp) try {
				await decompressFile(compressedFile, decompressedTempFile);
				await renameCacheFile(decompressedTempFile, decompressedFile);
				lastTimestamp = await getFileCreationTime(decompressedFile);
			} catch (err) {
				logger.warn({
					compressedFile,
					err,
					extension,
					decompressedFile,
					url
				}, "Failed to extract RPM metadata file from compressed file");
			}
			if (!lastTimestamp) throw new Error("Missing metadata in extracted RPM metadata file!");
			return decompressedFile;
		} finally {
			if (await cachePathExists(compressedFile)) await rmCache(compressedFile);
			if (await cachePathExists(decompressedTempFile)) await rmCache(decompressedTempFile);
		}
	} finally {
		releaseLock();
	}
}
//#endregion
export { buildReleaseResult, formatRpmVersion, getCachedDecompressedFile };

//# sourceMappingURL=common.js.map