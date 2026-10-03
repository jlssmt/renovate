import { logger } from "../../../logger/index.js";
import { createCacheReadStream } from "../../../util/fs/index.js";
import is from "@sindresorhus/is";
import readline from "node:readline";
//#region lib/modules/datasource/apk/parser.ts
function applyApkIndexLine(line, packageInfo) {
	const colonIndex = line.indexOf(":");
	if (colonIndex === -1) return;
	const key = line.substring(0, colonIndex);
	const value = line.substring(colonIndex + 1).trim();
	switch (key) {
		case "P":
			packageInfo.name = value;
			break;
		case "V":
			packageInfo.version = value;
			break;
		case "U":
			packageInfo.url = value;
			break;
		case "t": packageInfo.buildDate = parseInt(value, 10);
	}
}
function flushApkPackage(packageInfo) {
	if (packageInfo.name && packageInfo.version) return packageInfo;
	if (is.nonEmptyObject(packageInfo)) logger.warn({ packageInfo }, "Skipping package entry due to missing required fields");
	return null;
}
/**
* Parses an APK index file line-by-line to avoid loading large indexes into memory.
*
* @param extractedFile - Path to the extracted `APKINDEX` file (relative to Renovate cache).
*/
async function parseApkIndexFile(extractedFile) {
	logger.debug(`Parsing APK index file ${extractedFile}`);
	const packages = [];
	const rl = readline.createInterface({
		input: createCacheReadStream(extractedFile),
		terminal: false
	});
	let packageInfo = {};
	for await (const line of rl) if (line === "") {
		const pkg = flushApkPackage(packageInfo);
		if (pkg) packages.push(pkg);
		packageInfo = {};
	} else applyApkIndexLine(line, packageInfo);
	const last = flushApkPackage(packageInfo);
	if (last) packages.push(last);
	logger.debug(`Parsed ${packages.length} packages from APK index`);
	return packages;
}
//#endregion
export { parseApkIndexFile };

//# sourceMappingURL=parser.js.map