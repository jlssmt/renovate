import { regEx } from "../util/regex.js";
import { sanitizeValue } from "./utils.js";
import { quickStringify } from "../util/stringify.js";
import fs from "fs-extra";
//#region lib/logger/with-sanitizer.ts
function withSanitizer(streamConfig) {
	if (streamConfig.type === "rotating-file") throw new Error("Rotating files aren't supported");
	const stream = streamConfig.stream;
	if (stream?.writable) {
		function write(chunk, enc, cb) {
			const raw = sanitizeValue(chunk);
			const result = streamConfig.type === "raw" ? raw : quickStringify(raw)?.replace(regEx(/\n?$/), "\n");
			stream.write(result, enc, cb);
		}
		return {
			...streamConfig,
			type: "raw",
			stream: { write }
		};
	}
	if (streamConfig.path) {
		const fileStream = fs.createWriteStream(streamConfig.path, {
			flags: "a",
			encoding: "utf8"
		});
		return withSanitizer({
			...streamConfig,
			stream: fileStream
		});
	}
	throw new Error("Missing 'stream' or 'path' for bunyan stream");
}
//#endregion
export { withSanitizer };

//# sourceMappingURL=with-sanitizer.js.map