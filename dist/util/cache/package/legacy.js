import { decompressFromBase64, decompressFromBuffer } from "../../compress.js";
import { isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/util/cache/package/legacy.ts
async function decodeLegacyEntry(data) {
	if (data[0] === 123) return await decodeLegacyJsonEntry(data);
	return await decodeLegacySqliteEntry(data);
}
async function decodeLegacyJsonEntry(data) {
	const cached = JSON.parse(data.toString("utf8"));
	if (!isString(cached.value) || !isString(cached.expiry)) throw new Error("Invalid legacy JSON package cache entry");
	const json = await decompressFromBase64(cached.value);
	return {
		value: JSON.parse(json),
		expiry: DateTime.fromISO(cached.expiry)
	};
}
async function decodeLegacySqliteEntry(data) {
	const json = await decompressFromBuffer(data);
	return {
		value: JSON.parse(json),
		expiry: void 0
	};
}
//#endregion
export { decodeLegacyEntry };

//# sourceMappingURL=legacy.js.map