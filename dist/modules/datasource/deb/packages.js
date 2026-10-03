import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { toSha256 } from "../../../util/hash.js";
import { createCacheWriteStream, ensureCacheDir, pipeline, rmCache } from "../../../util/fs/index.js";
import "./common.js";
import { computeFileChecksum, parseChecksumsFromInRelease } from "./checksum.js";
import { checkIfModified, getBaseSuiteUrl } from "./url.js";
import { extract, getFileCreationTime } from "./utils.js";
import { randomUUID } from "node:crypto";
import upath from "upath";
//#region lib/modules/datasource/deb/packages.ts
/**
* Downloads and extracts a package file from a component URL.
*
* @param componentUrl - The URL of the component.
* @returns The path to the extracted file and the last modification timestamp.
* @throws Will throw an error if no valid compression method is found.
*/
async function downloadAndExtractPackage(componentUrl, http) {
	const packageUrlHash = toSha256(componentUrl);
	const fullCacheDir = await ensureCacheDir("deb");
	const extractedFile = upath.join(fullCacheDir, `${packageUrlHash}.txt`);
	let lastTimestamp = await getFileCreationTime(extractedFile);
	const compression = "gz";
	const compressedFile = upath.join(fullCacheDir, `${randomUUID()}_${packageUrlHash}.${compression}`);
	if (await downloadPackageFile(componentUrl, compression, compressedFile, http, lastTimestamp) || !lastTimestamp) try {
		await extract(compressedFile, compression, extractedFile);
		lastTimestamp = await getFileCreationTime(extractedFile);
	} catch (error) {
		logger.warn({
			compressedFile,
			componentUrl,
			compression,
			err: error
		}, "Failed to extract package file from compressed file");
	} finally {
		await rmCache(compressedFile);
	}
	if (!lastTimestamp) throw new Error("Missing metadata in extracted package index file!");
	return {
		extractedFile,
		lastTimestamp
	};
}
/**
* Downloads a package file if it has been modified since the last download timestamp.
*
* @param basePackageUrl - The base URL of the package.
* @param compression - The compression method used (e.g., 'gz').
* @param compressedFile - The path where the compressed file will be saved.
* @param lastDownloadTimestamp - The timestamp of the last download.
* @returns True if the file was downloaded, otherwise false.
*/
async function downloadPackageFile(basePackageUrl, compression, compressedFile, http, lastDownloadTimestamp) {
	const baseSuiteUrl = getBaseSuiteUrl(basePackageUrl);
	const packageUrl = joinUrlParts(basePackageUrl, `Packages.${compression}`);
	let needsToDownload = true;
	if (lastDownloadTimestamp) needsToDownload = await checkIfModified(packageUrl, lastDownloadTimestamp, http);
	if (!needsToDownload) {
		logger.debug(`No need to download ${packageUrl}, file is up to date.`);
		return false;
	}
	const readStream = http.stream(packageUrl);
	const writeStream = createCacheWriteStream(compressedFile);
	await pipeline(readStream, writeStream);
	logger.debug({
		url: packageUrl,
		targetFile: compressedFile
	}, "Downloading Debian package file");
	let inReleaseContent = "";
	try {
		inReleaseContent = await fetchInReleaseFile(baseSuiteUrl, http);
	} catch (error) {
		logger.debug({
			url: baseSuiteUrl,
			err: error
		}, "Could not fetch InRelease file");
	}
	if (inReleaseContent) {
		if (await computeFileChecksum(compressedFile) !== parseChecksumsFromInRelease(inReleaseContent, packageUrl.replace(`${baseSuiteUrl}/`, ""))) {
			await rmCache(compressedFile);
			throw new Error("SHA256 checksum validation failed");
		}
	}
	return needsToDownload;
}
/**
* Fetches the content of the InRelease file from the given base suite URL.
*
* @param baseReleaseUrl - The base URL of the suite (e.g., 'https://deb.debian.org/debian/dists/bullseye').
* @returns resolves to the content of the InRelease file.
* @throws An error if the InRelease file could not be downloaded.
*/
async function fetchInReleaseFile(baseReleaseUrl, http) {
	const inReleaseUrl = joinUrlParts(baseReleaseUrl, "InRelease");
	return (await http.getText(inReleaseUrl)).body;
}
//#endregion
export { downloadAndExtractPackage, downloadPackageFile, fetchInReleaseFile };

//# sourceMappingURL=packages.js.map