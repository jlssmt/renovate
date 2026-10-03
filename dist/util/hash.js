import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
//#region lib/util/hash.ts
function hash(data, algorithm = "sha512") {
	const hash = crypto.createHash(algorithm);
	hash.update(data);
	return hash.digest("hex");
}
function toSha256(input) {
	return hash(input, "sha256");
}
async function hashStream(inputStream, algorithm = "sha512") {
	const hash = crypto.createHash(algorithm);
	await pipeline(inputStream, hash);
	return hash.digest("hex");
}
//#endregion
export { hash, hashStream, toSha256 };

//# sourceMappingURL=hash.js.map