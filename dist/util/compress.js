import { promisify } from "node:util";
import zlib, { constants } from "node:zlib";
//#region lib/util/compress.ts
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);
async function compressToBuffer(input, quality = 8) {
	return await brotliCompress(input, { params: {
		[constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
		[constants.BROTLI_PARAM_QUALITY]: quality
	} });
}
async function decompressFromBuffer(input) {
	return (await brotliDecompress(input)).toString("utf8");
}
async function compressToBase64(input) {
	return (await compressToBuffer(input)).toString("base64");
}
async function decompressFromBase64(input) {
	return await decompressFromBuffer(Buffer.from(input, "base64"));
}
//#endregion
export { compressToBase64, compressToBuffer, decompressFromBase64, decompressFromBuffer };

//# sourceMappingURL=compress.js.map