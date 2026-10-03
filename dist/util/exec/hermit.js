import { newlineRegex } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceString } from "../string.js";
import { logger } from "../../logger/index.js";
import { findUpLocal } from "../fs/index.js";
import { rawExec } from "./common.js";
import upath from "upath";
//#region lib/util/exec/hermit.ts
function isHermit() {
	return GlobalConfig.get("binarySource") === "hermit";
}
async function findHermitCwd(cwd) {
	const relativeCwd = upath.relative(GlobalConfig.get("localDir"), cwd);
	const hermitFile = await findUpLocal("bin/hermit", relativeCwd);
	if (hermitFile === null) throw new Error(`hermit not found for ${cwd}`);
	return upath.join(GlobalConfig.get("localDir"), upath.dirname(hermitFile));
}
async function getHermitEnvs(rawOptions) {
	const cwd = coerceString(rawOptions.cwd);
	const hermitCwd = await findHermitCwd(cwd);
	logger.debug({
		cwd,
		hermitCwd
	}, "fetching hermit environment variables");
	const hermitEnvResp = await rawExec("./hermit env -r", {
		...rawOptions,
		cwd: hermitCwd
	});
	const out = {};
	const lines = hermitEnvResp.stdout.split(newlineRegex).map((line) => line.trim()).filter((line) => line.includes("="));
	for (const line of lines) {
		const equalIndex = line.indexOf("=");
		const name = line.substring(0, equalIndex);
		out[name] = line.substring(equalIndex + 1);
	}
	return out;
}
//#endregion
export { findHermitCwd, getHermitEnvs, isHermit };

//# sourceMappingURL=hermit.js.map