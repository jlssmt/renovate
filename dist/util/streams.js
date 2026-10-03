import { Readable } from "node:stream";
//#region lib/util/streams.ts
async function streamToString(stream) {
	const readable = Readable.from(stream);
	const chunks = [];
	return await new Promise((resolve, reject) => {
		readable.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		readable.on("error", (err) => reject(err));
	});
}
//#endregion
export { streamToString };

//# sourceMappingURL=streams.js.map