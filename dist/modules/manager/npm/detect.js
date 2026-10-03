import { logger } from "../../../logger/index.js";
import { readSystemFile } from "../../../util/fs/index.js";
import { isNonEmptyString } from "@sindresorhus/is";
import upath from "upath";
import os from "node:os";
//#region lib/modules/manager/npm/detect.ts
async function detectGlobalConfig() {
	const res = {};
	const homedir = os.homedir();
	const npmrcFileName = upath.join(homedir, ".npmrc");
	try {
		const npmrc = await readSystemFile(npmrcFileName, "utf8");
		// v8 ignore else -- TODO: add test #40625
		if (isNonEmptyString(npmrc)) {
			res.npmrc = npmrc;
			res.npmrcMerge = true;
			logger.debug(`Detected ${npmrcFileName} and adding it to global config`);
		}
	} catch {
		logger.warn({ npmrcFileName }, "Error reading .npmrc file");
	}
	return res;
}
//#endregion
export { detectGlobalConfig };

//# sourceMappingURL=detect.js.map