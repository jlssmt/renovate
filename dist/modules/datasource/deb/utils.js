import { createCacheReadStream, createCacheWriteStream, pipeline, statCacheFile } from "../../../util/fs/index.js";
import { createUnzip } from "node:zlib";
//#region lib/modules/datasource/deb/utils.ts
/**
* Extracts the specified compressed file to the output file.
*
* @param compressedFile - The path to the compressed file.
* @param compression - The compression method used (currently only 'gz' is supported).
* @param outputFile - The path where the extracted content will be stored.
* @throws Will throw an error if the compression method is unknown.
*/
async function extract(compressedFile, compression, outputFile) {
	if (compression === "gz") {
		const source = createCacheReadStream(compressedFile);
		const destination = createCacheWriteStream(outputFile);
		await pipeline(source, createUnzip(), destination);
	} else throw new Error(`Unsupported compression standard '${compression}'`);
}
/**
* Checks if the file exists and retrieves its creation time.
*
* @param filePath - The path to the file.
* @returns The creation time if the file exists, otherwise undefined.
*/
async function getFileCreationTime(filePath) {
	return (await statCacheFile(filePath))?.ctime;
}
//#endregion
export { extract, getFileCreationTime };

//# sourceMappingURL=utils.js.map